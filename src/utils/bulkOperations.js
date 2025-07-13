/**
 * 批量操作工具
 * 提供高效的批量CRUD操作和数据同步
 */

const mongoose = require('mongoose');
const { TransactionManager, RealtimeNotificationManager, dataSyncManager } = require('./dataSynchronization');
const { createError } = require('./errorHandler');

/**
 * 批量操作管理器
 * 支持批量创建、更新、删除操作
 */
class BulkOperationManager {
  constructor(model, options = {}) {
    this.model = model;
    this.options = {
      batchSize: options.batchSize || 100,
      enableNotifications: options.enableNotifications !== false,
      validateBeforeOperation: options.validateBeforeOperation !== false,
      continueOnError: options.continueOnError || false,
      ...options
    };
    this.results = {
      success: [],
      errors: [],
      summary: {
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0
      }
    };
  }

  /**
   * 批量创建记录
   * @param {Array} documents - 要创建的文档数组
   * @param {Object} context - 上下文信息（用户、权限等）
   * @returns {Object} 操作结果
   */
  async bulkCreate(documents, context = {}) {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw createError.badRequest('文档数组不能为空');
    }

    this.results.summary.total = documents.length;

    // 分批处理
    const batches = this.chunkArray(documents, this.options.batchSize);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        await this.processBatchCreate(batch, context, batchIndex);
      } catch (error) {
        console.error(`批次 ${batchIndex} 处理失败:`, error);
        
        if (!this.options.continueOnError) {
          throw error;
        }
        
        // 记录批次失败
        batch.forEach((doc, index) => {
          this.results.errors.push({
            index: batchIndex * this.options.batchSize + index,
            document: doc,
            error: error.message,
            type: 'batch_failure'
          });
          this.results.summary.failed++;
        });
      }
    }

    this.results.summary.processed = this.results.summary.successful + this.results.summary.failed;
    return this.results;
  }

  /**
   * 批量更新记录
   * @param {Array} updates - 更新操作数组 [{filter, update, options}]
   * @param {Object} context - 上下文信息
   * @returns {Object} 操作结果
   */
  async bulkUpdate(updates, context = {}) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw createError.badRequest('更新操作数组不能为空');
    }

    this.results.summary.total = updates.length;
    const batches = this.chunkArray(updates, this.options.batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        await this.processBatchUpdate(batch, context, batchIndex);
      } catch (error) {
        console.error(`更新批次 ${batchIndex} 失败:`, error);
        
        if (!this.options.continueOnError) {
          throw error;
        }
      }
    }

    this.results.summary.processed = this.results.summary.successful + this.results.summary.failed;
    return this.results;
  }

  /**
   * 批量删除记录
   * @param {Array} filters - 删除条件数组
   * @param {Object} context - 上下文信息
   * @returns {Object} 操作结果
   */
  async bulkDelete(filters, context = {}) {
    if (!Array.isArray(filters) || filters.length === 0) {
      throw createError.badRequest('删除条件数组不能为空');
    }

    this.results.summary.total = filters.length;
    const batches = this.chunkArray(filters, this.options.batchSize);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        await this.processBatchDelete(batch, context, batchIndex);
      } catch (error) {
        console.error(`删除批次 ${batchIndex} 失败:`, error);
        
        if (!this.options.continueOnError) {
          throw error;
        }
      }
    }

    this.results.summary.processed = this.results.summary.successful + this.results.summary.failed;
    return this.results;
  }

  /**
   * 处理创建批次
   */
  async processBatchCreate(batch, context, batchIndex) {
    const txManager = new TransactionManager();
    await txManager.start();

    try {
      const createdDocuments = [];

      // 验证文档
      if (this.options.validateBeforeOperation) {
        for (const doc of batch) {
          const validation = await this.validateDocument(doc, 'create', context);
          if (!validation.isValid) {
            throw createError.badRequest(`文档验证失败: ${validation.errors.join(', ')}`);
          }
        }
      }

      // 批量创建
      txManager.addOperation(async (session) => {
        const created = await this.model.insertMany(batch, { session, ordered: false });
        createdDocuments.push(...created);
        return created;
      });

      // 执行关联更新
      if (this.options.updateRelations) {
        txManager.addOperation(async (session) => {
          for (const doc of createdDocuments) {
            await this.updateRelatedDocuments('create', doc, session);
          }
          return { updated: createdDocuments.length };
        });
      }

      const results = await txManager.execute();
      
      // 执行数据同步
      for (const doc of createdDocuments) {
        await dataSyncManager.executeSync(this.model.modelName, 'create', doc, {
          session: txManager.session,
          ignoreErrors: true
        });
      }

      // 发送通知
      if (this.options.enableNotifications) {
        await this.sendBatchNotifications('created', createdDocuments, context);
      }

      // 记录成功
      createdDocuments.forEach((doc, index) => {
        this.results.success.push({
          index: batchIndex * this.options.batchSize + index,
          document: doc,
          id: doc._id
        });
        this.results.summary.successful++;
      });

    } catch (error) {
      await txManager.cancel();
      throw error;
    }
  }

  /**
   * 处理更新批次
   */
  async processBatchUpdate(batch, context, batchIndex) {
    const txManager = new TransactionManager();
    await txManager.start();

    try {
      const updatedDocuments = [];

      for (let i = 0; i < batch.length; i++) {
        const updateOp = batch[i];
        const { filter, update, options = {} } = updateOp;

        try {
          // 获取原始文档
          const originalDoc = await this.model.findOne(filter).session(txManager.session);
          if (!originalDoc) {
            this.results.errors.push({
              index: batchIndex * this.options.batchSize + i,
              operation: updateOp,
              error: '文档不存在',
              type: 'not_found'
            });
            this.results.summary.failed++;
            continue;
          }

          // 执行更新
          const updatedDoc = await this.model.findOneAndUpdate(
            filter,
            update,
            { 
              ...options, 
              new: true, 
              session: txManager.session,
              runValidators: true 
            }
          );

          if (updatedDoc) {
            updatedDocuments.push({
              original: originalDoc,
              updated: updatedDoc,
              changes: this.getChangedFields(originalDoc, update)
            });

            this.results.success.push({
              index: batchIndex * this.options.batchSize + i,
              operation: updateOp,
              id: updatedDoc._id,
              changes: this.getChangedFields(originalDoc, update)
            });
            this.results.summary.successful++;
          }

        } catch (updateError) {
          this.results.errors.push({
            index: batchIndex * this.options.batchSize + i,
            operation: updateOp,
            error: updateError.message,
            type: 'update_failed'
          });
          this.results.summary.failed++;

          if (!this.options.continueOnError) {
            throw updateError;
          }
        }
      }

      await txManager.execute();

      // 发送更新通知
      if (this.options.enableNotifications && updatedDocuments.length > 0) {
        await this.sendBatchNotifications('updated', updatedDocuments.map(d => d.updated), context);
      }

    } catch (error) {
      await txManager.cancel();
      throw error;
    }
  }

  /**
   * 处理删除批次
   */
  async processBatchDelete(batch, context, batchIndex) {
    const txManager = new TransactionManager();
    await txManager.start();

    try {
      const deletedDocuments = [];

      for (let i = 0; i < batch.length; i++) {
        const filter = batch[i];

        try {
          // 获取要删除的文档
          const docToDelete = await this.model.findOne(filter).session(txManager.session);
          if (!docToDelete) {
            this.results.errors.push({
              index: batchIndex * this.options.batchSize + i,
              filter,
              error: '文档不存在',
              type: 'not_found'
            });
            this.results.summary.failed++;
            continue;
          }

          // 执行删除
          const deleteResult = await this.model.findOneAndDelete(filter).session(txManager.session);
          
          if (deleteResult) {
            deletedDocuments.push(docToDelete);

            this.results.success.push({
              index: batchIndex * this.options.batchSize + i,
              filter,
              id: docToDelete._id,
              deletedDocument: docToDelete
            });
            this.results.summary.successful++;
          }

        } catch (deleteError) {
          this.results.errors.push({
            index: batchIndex * this.options.batchSize + i,
            filter,
            error: deleteError.message,
            type: 'delete_failed'
          });
          this.results.summary.failed++;

          if (!this.options.continueOnError) {
            throw deleteError;
          }
        }
      }

      // 执行级联删除和清理
      if (this.options.cascadeDelete) {
        txManager.addOperation(async (session) => {
          for (const doc of deletedDocuments) {
            await this.cascadeDelete(doc, session);
          }
          return { cascaded: deletedDocuments.length };
        });
      }

      await txManager.execute();

      // 发送删除通知
      if (this.options.enableNotifications && deletedDocuments.length > 0) {
        await this.sendBatchNotifications('deleted', deletedDocuments, context);
      }

    } catch (error) {
      await txManager.cancel();
      throw error;
    }
  }

  /**
   * 验证文档
   */
  async validateDocument(doc, operation, context) {
    const errors = [];
    
    // 基础验证（使用 Mongoose 验证器）
    try {
      const instance = new this.model(doc);
      await instance.validate();
    } catch (validationError) {
      if (validationError.errors) {
        Object.values(validationError.errors).forEach(err => {
          errors.push(err.message);
        });
      } else {
        errors.push(validationError.message);
      }
    }

    // 业务逻辑验证
    if (this.options.customValidator) {
      try {
        const customValidation = await this.options.customValidator(doc, operation, context);
        if (!customValidation.isValid) {
          errors.push(...customValidation.errors);
        }
      } catch (customError) {
        errors.push(`自定义验证失败: ${customError.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 发送批量通知
   */
  async sendBatchNotifications(type, documents, context) {
    if (!documents || documents.length === 0) {return;}

    const notificationData = {
      type: `batch_${type}`,
      modelName: this.model.modelName,
      count: documents.length,
      documents: documents.map(doc => ({
        id: doc._id,
        summary: this.getDocumentSummary(doc)
      })),
      operator: context.user || null,
      timestamp: new Date()
    };

    // 根据模型类型发送特定通知
    switch (this.model.modelName) {
      case 'Student':
        for (const doc of documents) {
          await RealtimeNotificationManager.notifyStudentUpdate(type, doc, notificationData);
        }
        break;
      case 'Course':
        for (const doc of documents) {
          await RealtimeNotificationManager.notifyCourseUpdate(type, doc, notificationData);
        }
        break;
      case 'Assignment':
        for (const doc of documents) {
          await RealtimeNotificationManager.notifyAssignmentUpdate(type, doc, notificationData);
        }
        break;
    }
  }

  /**
   * 获取文档摘要信息
   */
  getDocumentSummary(doc) {
    const summary = { id: doc._id };
    
    // 根据模型类型提取关键信息
    switch (this.model.modelName) {
      case 'Student':
        summary.name = doc.name;
        summary.studentId = doc.studentId;
        break;
      case 'Course':
        summary.name = doc.name;
        summary.courseId = doc.courseId;
        break;
      case 'Assignment':
        summary.title = doc.title;
        summary.dueDate = doc.dueDate;
        break;
      default:
        summary.name = doc.name || doc.title || 'Unknown';
    }
    
    return summary;
  }

  /**
   * 获取变更字段
   */
  getChangedFields(original, update) {
    const changes = {};
    
    // 处理 $set 更新
    if (update.$set) {
      Object.keys(update.$set).forEach(key => {
        if (original[key] !== update.$set[key]) {
          changes[key] = {
            old: original[key],
            new: update.$set[key]
          };
        }
      });
    }
    
    // 处理直接字段更新
    Object.keys(update).forEach(key => {
      if (!key.startsWith('$') && original[key] !== update[key]) {
        changes[key] = {
          old: original[key],
          new: update[key]
        };
      }
    });
    
    return changes;
  }

  /**
   * 数组分块
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 更新关联文档（需要子类实现）
   */
  async updateRelatedDocuments(operation, document, session) {
    // 子类可以重写此方法来处理特定的关联更新
    return Promise.resolve();
  }

  /**
   * 级联删除（需要子类实现）
   */
  async cascadeDelete(document, session) {
    // 子类可以重写此方法来处理特定的级联删除
    return Promise.resolve();
  }
}

/**
 * 学生批量操作管理器
 */
class StudentBulkOperationManager extends BulkOperationManager {
  constructor(options = {}) {
    const Student = require('../models/Student');
    super(Student, {
      updateRelations: true,
      cascadeDelete: true,
      ...options
    });
  }

  async updateRelatedDocuments(operation, student, session) {
    if (operation === 'create' && student.class) {
      const Class = require('../models/Class');
      await Class.findByIdAndUpdate(
        student.class,
        { 
          $addToSet: { students: student._id },
          $inc: { currentEnrollment: 1 }
        },
        { session }
      );
    }
  }

  async cascadeDelete(student, session) {
    const Grade = require('../models/Grade');
    const Submission = require('../models/Submission');
    const Class = require('../models/Class');

    // 删除成绩记录
    await Grade.deleteMany({ student: student._id }).session(session);
    
    // 删除提交记录
    await Submission.deleteMany({ student: student._id }).session(session);
    
    // 更新班级人数
    if (student.class) {
      await Class.findByIdAndUpdate(
        student.class,
        { 
          $pull: { students: student._id },
          $inc: { currentEnrollment: -1 }
        },
        { session }
      );
    }
  }
}

module.exports = {
  BulkOperationManager,
  StudentBulkOperationManager
};