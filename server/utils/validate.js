exports.validate = (arr) => {
    for(const e of arr) {
        if (!e) {
            return false;        
        }
    }
    
    return true;
} 