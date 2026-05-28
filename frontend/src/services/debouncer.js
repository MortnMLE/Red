export function debouncer(callback, wait) {
    let timeOutId = null;

    return function(...args) {
        if (timeOutId) {
            clearTimeout(timeOutId);
        }

        const context = this;
        timeOutId = setTimeout(() => {
            callback.apply(context, args);
        }, wait);
    }
}