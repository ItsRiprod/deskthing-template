export class SimpleSpinner {
    private frames: string[] = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    private interval: NodeJS.Timeout | null = null;
    private frameIndex = 0;
    private text: string = '';
    private active = false;
  
    start(text: string): SimpleSpinner {
      this.text = text;
      this.active = true;
      
      // Clear current line and hide cursor
      process.stdout.write('\x1B[?25l');
      
      this.interval = setInterval(() => {
        if (!this.active) return;
        
        // Clear current line
        process.stdout.write('\r\x1B[K');
        
        // Write new frame
        process.stdout.write(`${this.frames[this.frameIndex]} ${this.text}`);
        
        this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      }, 80);
      
      return this;
    }
  
    stop(success = true, finalText?: string): void {
      if (!this.active) return;
      
      clearInterval(this.interval!);
      this.active = false;
      
      // Clear current line
      process.stdout.write('\r\x1B[K');
      
      // Show cursor again
      process.stdout.write('\x1B[?25h');
      
      // Write final text
      if (finalText) {
        const symbol = success ? '✓' : '✗';
        console.log(`${symbol} ${finalText}`);
      }
    }
  
    setText(text: string): SimpleSpinner {
      this.text = text;
      return this;
    }
  }
  