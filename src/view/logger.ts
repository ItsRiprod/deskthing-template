import { SimpleSpinner } from "./spinner";

export class Logger {
  private static spinner: SimpleSpinner | null = null;
  private static isDebug = false;
  private static isSilent = false;
  private static messageQueue: { type: string; message: string; error?: unknown }[] = [];
  private static isConfigured = false;

  static configure(options: { debug?: boolean; silent?: boolean }) {
    this.isDebug = options.debug || false;
    this.isSilent = options.silent || false;
    this.isConfigured = true;
    this.flushMessageQueue();
  }

  private static flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) {
        switch (msg.type) {
          case 'info':
            this.info(msg.message);
            break;
          case 'success':
            this.success(msg.message);
            break;
          case 'warning':
            this.warning(msg.message, msg.error);
            break;
          case 'error':
            this.error(msg.message, msg.error);
            break;
          case 'debug':
            this.debug(msg.message);
            break;
          case 'header':
            this.header(msg.message);
            break;
        }
      }
    }
  }

  static info(message: string): void {
    if (!this.isConfigured) {
      this.messageQueue.push({ type: 'info', message });
      return;
    }
    if (!this.isSilent) {
      console.log('\x1b[36m%s\x1b[0m', message);    
    }
  }

  static success(message: string): void {
    if (!this.isConfigured) {
      this.messageQueue.push({ type: 'success', message });
      return;
    }
    if (!this.isSilent) {
      console.log('\x1b[32m%s\x1b[0m', `✨ ${message}`);
    }
  }

  static warning(message: string, error?: unknown): void {
    if (!this.isConfigured) {
      this.messageQueue.push({ type: 'warning', message, error });
      return;
    }
    if (!this.isSilent) {
      if (error instanceof Error) {
        console.log('\x1b[33m%s\x1b[0m', `⚠️ ${message}: ${error.message}`);
      } else {
        console.log('\x1b[33m%s\x1b[0m', `⚠️ ${message}`);
      }
      if (error && this.isDebug) {
        console.error('\x1b[31m%s\x1b[0m', error);
      }
    }
  }

  static error(message: string, error?: unknown): void {
    if (!this.isConfigured) {
      this.messageQueue.push({ type: 'error', message, error });
      return;
    }
    if (!this.isSilent) {
      if (error instanceof Error) {
        console.error('\x1b[31m%s\x1b[0m', `❌ ${message}: ${error.message}`);
      } else {
        console.error('\x1b[31m%s\x1b[0m', `❌ ${message}`);
      }
      if (error && this.isDebug) {
        console.error('\x1b[31m%s\x1b[0m', error);
      }
    }
  }

  static debug(message: string): void {
    if (!this.isConfigured) {
      this.messageQueue.push({ type: 'debug', message });
      return;
    }
    if (this.isDebug && !this.isSilent) {
      console.log('\x1b[90m%s\x1b[0m', `🔍 [DEBUG] ${message}`);
    }
  }

  static header(message: string): void {
    if (!this.isConfigured) {
      this.messageQueue.push({ type: 'header', message });
      return;
    }
    if (!this.isSilent) {
      console.log('\x1b[96m\x1b[1m%s\x1b[0m', `\n${message}\n`);
    }
  }

  static startProgress(message: string): void {
    if (!this.isSilent) {
      this.spinner = new SimpleSpinner().start(message);
    }
  }

  static updateProgress(message: string): void {
    if (!this.isSilent && this.spinner) {
      this.spinner.setText(message);
    }
  }

  static stopProgress(success = true, message?: string): void {
    if (!this.isSilent && this.spinner) {
      this.spinner.stop(success, message);
      this.spinner = null;
    }
  }

  static newLine(): void {
    if (!this.isSilent) {
      console.log();
    }
  }
}