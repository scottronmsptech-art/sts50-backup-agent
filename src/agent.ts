// STS50 Backup Agent for Windows
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import WebSocket from 'ws';

interface AgentConfig {
  serverUrl: string;
  deviceId: string;
  token: string;
}

class STS50Agent {
  private config: AgentConfig;
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async start() {
    console.log('STS50 Backup Agent starting...');
    console.log('Device:', os.hostname());
    console.log('Platform:', os.platform());
    
    await this.connectToServer();
    this.startHeartbeat();
  }

  private async connectToServer() {
    try {
      this.ws = new WebSocket(this.config.serverUrl);
      
      this.ws.on('open', () => {
        console.log('Connected to STS50 server');
        this.sendSystemInfo();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.handleMessage(message);
      });

      this.ws.on('close', () => {
        console.log('Disconnected from server, reconnecting...');
        setTimeout(() => this.connectToServer(), 5000);
      });
    } catch (error) {
      console.error('Connection error:', error);
    }
  }

  private sendSystemInfo() {
    const systemInfo = {
      type: 'system_info',
      deviceId: this.config.deviceId,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem()
    };
    this.ws?.send(JSON.stringify(systemInfo));
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat', deviceId: this.config.deviceId }));
      }
    }, 30000);
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'backup_start':
        this.startBackup(message.config);
        break;
      case 'backup_cancel':
        this.cancelBackup();
        break;
      default:
        console.log('Unknown message:', message);
    }
  }

  private async startBackup(config: any) {
    console.log('Starting backup with config:', config);
    // Backup implementation
  }

  private cancelBackup() {
    console.log('Backup cancelled');
  }
}

// Load config and start agent
const configPath = path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'STS50', 'config.json');
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const agent = new STS50Agent(config);
  agent.start();
} else {
  console.error('Config not found at:', configPath);
  process.exit(1);
}
