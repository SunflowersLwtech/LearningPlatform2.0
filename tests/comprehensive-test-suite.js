const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class ComprehensiveTestSuite {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.tokens = {};
    this.testData = {};
    this.results = {
      passed: 0,
      failed: 0,
      errors: [],
      warnings: [],
      total: 0
    };
  }

  // Utility methods
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 智能延迟函数，避免频率限制
  async smartDelay() {
    // 基础延迟 50ms
    await this.sleep(50);
    // 每10个请求额外延迟
    if (this.results.total % 10 === 0) {
      await this.sleep(200);
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'debug': '🔍'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async makeRequest(method, endpoint, data = null, token = null, options = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }

      if (data && method !== 'GET') {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status, headers: response.headers };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async runTest(testName, testFunction) {
    this.results.total++;
    try {
      this.log(`Running: ${testName}`, 'info');
      await testFunction();
      this.results.passed++;
      this.log(`PASSED: ${testName}`, 'success');
      // 添加智能延迟避免频率限制
      await this.smartDelay();
      return true;
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: testName, error: error.message });
      this.log(`FAILED: ${testName} - ${error.message}`, 'error');
      // 失败后也需要延迟
      await this.smartDelay();
      return false;
    }
  }

  // Authentication Tests
  async testAuthenticationFlow() {
    await this.runTest('Staff Login', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        identifier: 'principal@school.edu',
        password: 'admin123',
        userType: 'staff'
      });

      if (!response.success) {
        throw new Error(`Login failed: ${JSON.stringify(response.error)}`);
      }

      if (!response.data.data.accessToken) {
        throw new Error('No access token received');
      }

      this.tokens.staff = response.data.data.accessToken;
      this.testData.staffUser = response.data.data.user;
      this.log('Staff token obtained successfully', 'debug');
    });

    await this.runTest('Student Login', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        identifier: '20230001',
        password: '20230001',
        userType: 'student'
      });

      if (!response.success) {
        throw new Error(`Student login failed: ${JSON.stringify(response.error)}`);
      }

      this.tokens.student = response.data.data.accessToken;
      this.testData.studentUser = response.data.data.user;
      this.log('Student token obtained successfully', 'debug');
    });

    await this.runTest('Invalid Login Attempt', async () => {
      const response = await this.makeRequest('POST', '/auth/login', {
        identifier: 'invalid@email.com',
        password: 'wrongpassword',
        userType: 'staff'
      });

      if (response.success) {
        throw new Error('Invalid login should have failed');
      }

      if (response.status !== 401 && response.status !== 400) {
        throw new Error(`Expected 401/400 status, got ${response.status}`);
      }
    });

    await this.runTest('Token Validation', async () => {
      const response = await this.makeRequest('GET', '/auth/me', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Token validation failed: ${JSON.stringify(response.error)}`);
      }

      if (!response.data.data.user.id) {
        throw new Error('User data not returned');
      }
    });
  }

  // Student Management Tests
  async testStudentManagement() {
    await this.runTest('Get All Students', async () => {
      const response = await this.makeRequest('GET', '/students', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get students: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Students data is not an array');
      }

      this.testData.students = response.data.data;
      this.log(`Found ${this.testData.students.length} students`, 'debug');
    });

    await this.runTest('Get Student by ID', async () => {
      if (!this.testData.students || this.testData.students.length === 0) {
        throw new Error('No students available for testing');
      }

      const studentId = this.testData.students[0]._id;
      const response = await this.makeRequest('GET', `/students/${studentId}`, null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get student: ${JSON.stringify(response.error)}`);
      }

      if (!response.data.data) {
        throw new Error('Student data not returned');
      }
    });

    await this.runTest('Search Students', async () => {
      const response = await this.makeRequest('GET', '/students?search=测试', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Search failed: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Search results not an array');
      }
    });

    await this.runTest('Filter Students by Grade', async () => {
      const response = await this.makeRequest('GET', '/students?grade=一年级', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Grade filter failed: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Filtered results not an array');
      }
    });
  }

  // Class Management Tests
  async testClassManagement() {
    await this.runTest('Get All Classes', async () => {
      const response = await this.makeRequest('GET', '/classes', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get classes: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Classes data is not an array');
      }

      this.testData.classes = response.data.data;
      this.log(`Found ${this.testData.classes.length} classes`, 'debug');
    });

    if (this.testData.classes && this.testData.classes.length > 0) {
      await this.runTest('Get Class Details', async () => {
        const classId = this.testData.classes[0]._id;
        const response = await this.makeRequest('GET', `/classes/${classId}`, null, this.tokens.staff);

        if (!response.success) {
          throw new Error(`Failed to get class details: ${JSON.stringify(response.error)}`);
        }

        if (!response.data.data) {
          throw new Error('Class data not returned');
        }
      });

      await this.runTest('Get Class Students', async () => {
        const classId = this.testData.classes[0]._id;
        const response = await this.makeRequest('GET', `/classes/${classId}/students`, null, this.tokens.staff);

        if (!response.success) {
          throw new Error(`Failed to get class students: ${JSON.stringify(response.error)}`);
        }

        if (!Array.isArray(response.data.data)) {
          throw new Error('Class students data is not an array');
        }
      });
    }
  }

  // Course Management Tests
  async testCourseManagement() {
    await this.runTest('Get All Courses', async () => {
      const response = await this.makeRequest('GET', '/courses', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get courses: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Courses data is not an array');
      }

      this.testData.courses = response.data.data;
      this.log(`Found ${this.testData.courses.length} courses`, 'debug');
    });

    if (this.testData.courses && this.testData.courses.length > 0) {
      await this.runTest('Get Course Details', async () => {
        const courseId = this.testData.courses[0]._id;
        const response = await this.makeRequest('GET', `/courses/${courseId}`, null, this.tokens.staff);

        if (!response.success) {
          throw new Error(`Failed to get course details: ${JSON.stringify(response.error)}`);
        }

        if (!response.data.data) {
          throw new Error('Course data not returned');
        }
      });
    }
  }

  // Assignment Tests
  async testAssignmentSystem() {
    await this.runTest('Get All Assignments (Staff)', async () => {
      const response = await this.makeRequest('GET', '/assignments', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get assignments: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Assignments data is not an array');
      }

      this.testData.assignments = response.data.data;
      this.log(`Found ${this.testData.assignments.length} assignments`, 'debug');
    });

    await this.runTest('Get Student Assignments', async () => {
      const response = await this.makeRequest('GET', '/learning/assignments', null, this.tokens.student);

      if (!response.success) {
        throw new Error(`Failed to get student assignments: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Student assignments data is not an array');
      }
    });

    if (this.testData.assignments && this.testData.assignments.length > 0) {
      await this.runTest('Get Assignment Details', async () => {
        const assignmentId = this.testData.assignments[0]._id;
        const response = await this.makeRequest('GET', `/assignments/${assignmentId}`, null, this.tokens.staff);

        if (!response.success) {
          throw new Error(`Failed to get assignment details: ${JSON.stringify(response.error)}`);
        }

        if (!response.data.data) {
          throw new Error('Assignment data not returned');
        }
      });

      await this.runTest('Get Assignment Submissions', async () => {
        const assignmentId = this.testData.assignments[0]._id;
        const response = await this.makeRequest('GET', `/assignments/${assignmentId}/submissions`, null, this.tokens.staff);

        if (!response.success) {
          throw new Error(`Failed to get submissions: ${JSON.stringify(response.error)}`);
        }

        if (!Array.isArray(response.data.data)) {
          throw new Error('Submissions data is not an array');
        }
      });
    }
  }

  // Resource Tests
  async testResourceSystem() {
    await this.runTest('Get All Resources', async () => {
      const response = await this.makeRequest('GET', '/learning/resources', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get resources: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Resources data is not an array');
      }

      this.testData.resources = response.data.data;
      this.log(`Found ${this.testData.resources.length} resources`, 'debug');
    });

    if (this.testData.resources && this.testData.resources.length > 0) {
      await this.runTest('Download Resource', async () => {
        const resourceId = this.testData.resources[0]._id;
        const response = await this.makeRequest('GET', `/learning/resources/${resourceId}/download`, null, this.tokens.staff, {
          responseType: 'arraybuffer'
        });

        if (!response.success) {
          throw new Error(`Failed to download resource: ${JSON.stringify(response.error)}`);
        }

        if (!response.data || response.data.length === 0) {
          throw new Error('No data received from download');
        }

        this.log(`Downloaded ${response.data.length} bytes`, 'debug');
      });
    }

    await this.runTest('Get Student Resources', async () => {
      const response = await this.makeRequest('GET', '/learning/resources', null, this.tokens.student);

      if (!response.success) {
        throw new Error(`Failed to get student resources: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Student resources data is not an array');
      }
    });
  }

  // Discussion Tests
  async testDiscussionSystem() {
    await this.runTest('Get All Discussions', async () => {
      const response = await this.makeRequest('GET', '/learning/discussions', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get discussions: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Discussions data is not an array');
      }

      this.testData.discussions = response.data.data;
      this.log(`Found ${this.testData.discussions.length} discussions`, 'debug');
    });

    if (this.testData.discussions && this.testData.discussions.length > 0) {
      await this.runTest('Get Discussion Details', async () => {
        const discussionId = this.testData.discussions[0]._id;
        const response = await this.makeRequest('GET', `/learning/discussions/${discussionId}`, null, this.tokens.staff);

        if (!response.success) {
          throw new Error(`Failed to get discussion details: ${JSON.stringify(response.error)}`);
        }

        if (!response.data.data) {
          throw new Error('Discussion data not returned');
        }
      });
    }

    await this.runTest('Get Student Discussions', async () => {
      const response = await this.makeRequest('GET', '/learning/discussions', null, this.tokens.student);

      if (!response.success) {
        throw new Error(`Failed to get student discussions: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Student discussions data is not an array');
      }
    });
  }

  // Analytics Tests
  async testAnalyticsSystem() {
    await this.runTest('Get Student Statistics', async () => {
      const response = await this.makeRequest('GET', '/analytics/students/stats', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get student stats: ${JSON.stringify(response.error)}`);
      }

      if (!response.data.data) {
        throw new Error('Student stats data not returned');
      }
    });

    await this.runTest('Get Class Statistics', async () => {
      const response = await this.makeRequest('GET', '/analytics/classes/stats', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get class stats: ${JSON.stringify(response.error)}`);
      }

      if (!response.data.data) {
        throw new Error('Class stats data not returned');
      }
    });

    await this.runTest('Get Assignment Statistics', async () => {
      const response = await this.makeRequest('GET', '/analytics/assignments/stats', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get assignment stats: ${JSON.stringify(response.error)}`);
      }

      if (!response.data.data) {
        throw new Error('Assignment stats data not returned');
      }
    });

    await this.runTest('Get Performance Analytics', async () => {
      const response = await this.makeRequest('GET', '/analytics/performance', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get performance analytics: ${JSON.stringify(response.error)}`);
      }

      if (!response.data.data) {
        throw new Error('Performance analytics data not returned');
      }
    });
  }

  // Permission Tests
  async testPermissionSystem() {
    await this.runTest('Staff Access Control', async () => {
      const response = await this.makeRequest('GET', '/students', null, this.tokens.staff);

      if (!response.success) {
        throw new Error('Staff should have access to student data');
      }
    });

    await this.runTest('Student Access Restrictions', async () => {
      const response = await this.makeRequest('GET', '/students', null, this.tokens.student);

      if (response.success) {
        throw new Error('Student should NOT have access to all student data');
      }

      if (response.status !== 403) {
        throw new Error(`Expected 403 status, got ${response.status}`);
      }
    });

    await this.runTest('Unauthorized Access', async () => {
      const response = await this.makeRequest('GET', '/students', null, null);

      if (response.success) {
        throw new Error('Unauthorized access should be denied');
      }

      if (response.status !== 401) {
        throw new Error(`Expected 401 status, got ${response.status}`);
      }
    });
  }

  // Staff Management Tests
  async testStaffManagement() {
    await this.runTest('Get All Staff', async () => {
      const response = await this.makeRequest('GET', '/staff', null, this.tokens.staff);

      if (!response.success) {
        throw new Error(`Failed to get staff: ${JSON.stringify(response.error)}`);
      }

      if (!Array.isArray(response.data.data)) {
        throw new Error('Staff data is not an array');
      }

      this.testData.staff = response.data.data;
      this.log(`Found ${this.testData.staff.length} staff members`, 'debug');
    });

    if (this.testData.staff && this.testData.staff.length > 0) {
      await this.runTest('Get Staff Details', async () => {
        const staffId = this.testData.staff[0]._id;
        const response = await this.makeRequest('GET', `/staff/${staffId}`, null, this.tokens.staff);

        if (!response.success) {
          throw new Error(`Failed to get staff details: ${JSON.stringify(response.error)}`);
        }

        if (!response.data.data) {
          throw new Error('Staff data not returned');
        }
      });
    }
  }

  // Main test runner
  async run() {
    this.log('🚀 Starting Comprehensive Test Suite', 'info');
    this.log(`Testing against: ${this.baseURL}`, 'info');

    try {
      // Check if server is running
      const healthCheck = await this.makeRequest('GET', '');
      if (!healthCheck.success) {
        throw new Error('Server is not running or not accessible');
      }
      this.log('Server health check passed', 'success');

      // Run all test modules
      this.log('\n=== Authentication Tests ===', 'info');
      await this.testAuthenticationFlow();

      this.log('\n=== Permission Tests ===', 'info');
      await this.testPermissionSystem();

      this.log('\n=== Student Management Tests ===', 'info');
      await this.testStudentManagement();

      this.log('\n=== Staff Management Tests ===', 'info');
      await this.testStaffManagement();

      this.log('\n=== Class Management Tests ===', 'info');
      await this.testClassManagement();

      this.log('\n=== Course Management Tests ===', 'info');
      await this.testCourseManagement();

      this.log('\n=== Assignment System Tests ===', 'info');
      await this.testAssignmentSystem();

      this.log('\n=== Resource System Tests ===', 'info');
      await this.testResourceSystem();

      this.log('\n=== Discussion System Tests ===', 'info');
      await this.testDiscussionSystem();

      this.log('\n=== Analytics System Tests ===', 'info');
      await this.testAnalyticsSystem();

    } catch (error) {
      this.log(`Critical error: ${error.message}`, 'error');
      this.results.failed++;
      this.results.errors.push({ test: 'System Setup', error: error.message });
    }

    this.generateReport();
  }

  generateReport() {
    this.log('\n🎯 TEST RESULTS SUMMARY', 'info');
    this.log('=' * 50, 'info');
    this.log(`Total Tests: ${this.results.total}`, 'info');
    this.log(`Passed: ${this.results.passed}`, 'success');
    this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`, 'info');

    if (this.results.errors.length > 0) {
      this.log('\n❌ FAILED TESTS:', 'error');
      this.results.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error.test}: ${error.error}`, 'error');
      });
    }

    if (this.results.warnings.length > 0) {
      this.log('\n⚠️ WARNINGS:', 'warning');
      this.results.warnings.forEach((warning, index) => {
        this.log(`${index + 1}. ${warning}`, 'warning');
      });
    }

    // Save detailed report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / this.results.total) * 100).toFixed(2)
      },
      errors: this.results.errors,
      warnings: this.results.warnings,
      testData: this.testData
    };

    try {
      fs.writeFileSync(
        path.join(__dirname, '../test-report.json'),
        JSON.stringify(reportData, null, 2)
      );
      this.log('\n📄 Detailed report saved to test-report.json', 'info');
    } catch (error) {
      this.log(`Failed to save report: ${error.message}`, 'warning');
    }

    if (this.results.failed === 0) {
      this.log('\n🎉 All tests passed! System is functioning correctly.', 'success');
    } else {
      this.log('\n🔧 Some tests failed. Please review the errors above.', 'error');
    }
  }
}

// Run the tests
if (require.main === module) {
  const testSuite = new ComprehensiveTestSuite();
  testSuite.run().catch(error => {
    console.error('Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveTestSuite;