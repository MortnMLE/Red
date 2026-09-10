const bcrypt = require('bcrypt');

function create(username, password) {
    return {
        username,
        password,
    };
}

function isEqual(one, other) {
    return one.username === other.username;
}

function isValid(user) {
    return user.username !== '' &&
        user.username !== null &&
        user.password !== '' &&
        user.password !== null;
}

async function passwordIsEqual(plain, hash) {
    return await bcrypt.compare(plain, hash);
}

module.exports = {
    create,
    isEqual,
    isValid,
    passwordIsEqual
}