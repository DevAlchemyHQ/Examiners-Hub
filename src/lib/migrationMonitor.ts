// Migration Monitor - Simple way to track migration progress
import { ServiceManager } from './services';

export interface MigrationStatus {
  service: string;
  currentProvider: 'Supabase' | 'AWS';
  status: 'active' | 'migrating' | 'error';
  lastChecked: Date;
  features: string[];
}

class MigrationMonitor {
  private static instance: MigrationMonitor;
  private status: Map<string, MigrationStatus> = new Map();

  static getInstance(): MigrationMonitor {
    if (!MigrationMonitor.instance) {
      MigrationMonitor.instance = new MigrationMonitor();
    }
    return MigrationMonitor.instance;
  }

  // Initialize monitoring for all services
  initialize() {
    console.log('🚀 Migration Monitor Initialized');
    console.log('📊 Tracking: Authentication, Storage, Profile services');
    
    // Check if AWS auth is enabled
    const featureFlags = ServiceManager.getFeatureFlags();
    const authProvider = featureFlags.AUTH_USE_AWS ? 'AWS' : 'Supabase';
    
    this.updateStatus('auth', {
      service: 'Authentication',
      currentProvider: authProvider,
      status: 'active',
      lastChecked: new Date(),
      features: ['Sign In', 'Sign Up', 'Password Reset', 'OTP Verification']
    });

    this.updateStatus('storage', {
      service: 'Storage',
      currentProvider: 'Supabase',
      status: 'active',
      lastChecked: new Date(),
      features: ['File Upload', 'File Download', 'Image Storage']
    });

    this.updateStatus('profile', {
      service: 'Profile Management',
      currentProvider: 'Supabase',
      status: 'active',
      lastChecked: new Date(),
      features: ['Profile Update', 'Avatar Upload', 'User Data']
    });

    this.updateStatus('database', {
      service: 'Database',
      currentProvider: 'Supabase',
      status: 'active',
      lastChecked: new Date(),
      features: ['User Profiles', 'Projects', 'Bulk Defects', 'Defect Sets', 'PDF State']
    });

    this.logCurrentStatus();
  }

  // Update status for a specific service
  updateStatus(serviceKey: string, status: MigrationStatus) {
    this.status.set(serviceKey, status);
    this.logServiceStatus(serviceKey, status);
  }

  // Get current migration status
  getCurrentStatus(): MigrationStatus[] {
    return Array.from(this.status.values());
  }

  // Check if any service is using AWS
  isAnyServiceUsingAWS(): boolean {
    return Array.from(this.status.values()).some(s => s.currentProvider === 'AWS');
  }

  // Get migration progress percentage
  getMigrationProgress(): number {
    const totalServices = this.status.size;
    const awsServices = Array.from(this.status.values()).filter(s => s.currentProvider === 'AWS').length;
    return Math.round((awsServices / totalServices) * 100);
  }

  // Log current status to console
  logCurrentStatus() {
    console.log('\n📊 === MIGRATION STATUS ===');
    console.log(`Overall Progress: ${this.getMigrationProgress()}%`);
    
    this.status.forEach((status, key) => {
      const emoji = status.currentProvider === 'AWS' ? '☁️' : '🔵';
      console.log(`${emoji} ${status.service}: ${status.currentProvider} (${status.status})`);
    });
    
    console.log('========================\n');
  }

  // Log individual service status
  logServiceStatus(serviceKey: string, status: MigrationStatus) {
    const emoji = status.currentProvider === 'AWS' ? '☁️' : '🔵';
    console.log(`🔄 ${emoji} ${status.service} switched to ${status.currentProvider}`);
    console.log(`   Features: ${status.features.join(', ')}`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Time: ${status.lastChecked.toLocaleTimeString()}\n`);
  }

  // Test service functionality
  async testService(serviceKey: string): Promise<boolean> {
    try {
      const status = this.status.get(serviceKey);
      if (!status) return false;

      console.log(`🧪 Testing ${status.service}...`);
      
      // Simulate service test
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const isWorking = Math.random() > 0.1; // 90% success rate for demo
      
      if (isWorking) {
        console.log(`✅ ${status.service} is working correctly`);
      } else {
        console.log(`❌ ${status.service} has issues`);
      }
      
      return isWorking;
    } catch (error) {
      console.error(`❌ Error testing ${serviceKey}:`, error);
      return false;
    }
  }

  // Test all services
  async testAllServices() {
    console.log('\n🧪 === TESTING ALL SERVICES ===');
    
    for (const [key, status] of this.status) {
      const isWorking = await this.testService(key);
      this.updateStatus(key, {
        ...status,
        status: isWorking ? 'active' : 'error',
        lastChecked: new Date()
      });
    }
    
    console.log('✅ Service testing complete\n');
  }

  // Switch service to AWS
  switchToAWS(serviceKey: string) {
    const status = this.status.get(serviceKey);
    if (!status) return;

    console.log(`🔄 Switching ${status.service} to AWS...`);
    
    this.updateStatus(serviceKey, {
      ...status,
      currentProvider: 'AWS',
      status: 'migrating',
      lastChecked: new Date()
    });

    // Simulate migration process
    setTimeout(() => {
      this.updateStatus(serviceKey, {
        ...status,
        currentProvider: 'AWS',
        status: 'active',
        lastChecked: new Date()
      });
      console.log(`✅ ${status.service} successfully migrated to AWS`);
    }, 2000);
  }

  // Switch service back to Supabase
  switchToSupabase(serviceKey: string) {
    const status = this.status.get(serviceKey);
    if (!status) return;

    console.log(`🔄 Switching ${status.service} back to Supabase...`);
    
    this.updateStatus(serviceKey, {
      ...status,
      currentProvider: 'Supabase',
      status: 'active',
      lastChecked: new Date()
    });

    console.log(`✅ ${status.service} switched back to Supabase`);
  }
}

export const migrationMonitor = MigrationMonitor.getInstance(); 