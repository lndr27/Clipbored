class StopWatch {
    
    constructor() {
        this.startTime = null;
        this.endTime = null;
    }

    start() {
        this.startTime = (new Date()).getTime();
    }

    stop() {
        this.endTime = (new Date()).getTime();
    }

    clear() {
        this.startTime = this.endTime = null;
    }

    getMiliseconds() {
        return !this.endTime ? 0 : (this.endTime - this.startTime);
    }

    getSeconds() {
        return this.getMiliseconds() / 1000;
    }

    getMinutes() {
        return this.getSeconds() / 60;
    }

    getHours() {
        return this.getMinutes() / 60;
    }

    getDays() {
        return this.getHours() / 24;
    }
}
module.exports = StopWatch;