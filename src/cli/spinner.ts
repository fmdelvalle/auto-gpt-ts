class Spinner {
    private spinner: string[];
    private delay: number;
    private message: string;
    private running: boolean;
    private spinnerThread: NodeJS.Timeout | null;
  
    constructor(message: string = "Loading...", delay: number = 100) {
      this.spinner = ["-", "/", "|", "\\"];
      this.delay = delay;
      this.message = message;
      this.running = false;
      this.spinnerThread = null;
    }
  
    private spin(): void {
      let i = 0;
      this.spinnerThread = setInterval(() => {
        process.stdout.write(`${this.spinner[i]} ${this.message}\r`);
        i = (i + 1) % this.spinner.length;
      }, this.delay);
    }
  
    public start(): void {
      this.running = true;
      this.spin();
    }
  
    public stop(): void {
      this.running = false;
      if (this.spinnerThread) {
        clearInterval(this.spinnerThread);
        this.spinnerThread = null;
      }
      process.stdout.write(`\r${" ".repeat(this.message.length + 2)}\r`);
    }
  
    public updateMessage(newMessage: string, delay: number = 0.1): void {
      setTimeout(() => {
        process.stdout.write(`\r${" ".repeat(this.message.length + 2)}\r`);
        this.message = newMessage;
      }, delay * 1000);
    }
  }
  
  export default Spinner;