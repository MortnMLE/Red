const bcrypt = require('bcrypt');

const {
  create,
  isEqual,
  isValid,
  passwordIsEqual,
} = require('../../../src/models/user');

jest.mock('bcrypt');

describe('create', () => {
  test('should create a user with username and password', async () => {
    const result = await create('john', 'secret');

    expect(result).toEqual({
      username: 'john',
      password: 'secret',
    });
  });

  test('should preserve empty values', async () => {
    const result = await create('', '');

    expect(result).toEqual({
      username: '',
      password: '',
    });
  });
});

describe('isEqual', () => {
  test('should return true when usernames are equal', () => {
    const one = {
      username: 'john',
      password: 'password1',
    };

    const other = {
      username: 'john',
      password: 'password2',
    };

    expect(isEqual(one, other)).toBe(true);
  });

  test('should return false when usernames are different', () => {
    const one = {
      username: 'john',
      password: 'password',
    };

    const other = {
      username: 'jane',
      password: 'password',
    };

    expect(isEqual(one, other)).toBe(false);
  });

  test('should ignore passwords when comparing users', () => {
    const one = {
      username: 'john',
      password: 'password1',
    };

    const other = {
      username: 'john',
      password: 'completely-different',
    };

    expect(isEqual(one, other)).toBe(true);
  });
});

describe('isValid', () => {
  test('should return true for a valid user', () => {
    const user = {
      username: 'john',
      password: 'secret',
    };

    expect(isValid(user)).toBe(true);
  });

  test('should return false when username is empty', () => {
    const user = {
      username: '',
      password: 'secret',
    };

    expect(isValid(user)).toBe(false);
  });

  test('should return false when username is null', () => {
    const user = {
      username: null,
      password: 'secret',
    };

    expect(isValid(user)).toBe(false);
  });

  test('should return false when password is empty', () => {
    const user = {
      username: 'john',
      password: '',
    };

    expect(isValid(user)).toBe(false);
  });

  test('should return false when password is null', () => {
    const user = {
      username: 'john',
      password: null,
    };

    expect(isValid(user)).toBe(false);
  });

  test('should return false when both username and password are empty', () => {
    const user = {
      username: '',
      password: '',
    };

    expect(isValid(user)).toBe(false);
  });
});

describe('passwordIsEqual', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return true when bcrypt.compare returns true', async () => {
    bcrypt.compare.mockResolvedValue(true);

    const result = await passwordIsEqual(
      'secret',
      '$2b$10$somehashedpassword'
    );

    expect(result).toBe(true);

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'secret',
      '$2b$10$somehashedpassword'
    );
  });

  test('should return false when bcrypt.compare returns false', async () => {
    bcrypt.compare.mockResolvedValue(false);

    const result = await passwordIsEqual(
      'wrong-password',
      '$2b$10$somehashedpassword'
    );

    expect(result).toBe(false);

    expect(bcrypt.compare).toHaveBeenCalledWith(
      'wrong-password',
      '$2b$10$somehashedpassword'
    );
  });

  test('should propagate an error from bcrypt.compare', async () => {
    const error = new Error('bcrypt error');

    bcrypt.compare.mockRejectedValue(error);

    await expect(
      passwordIsEqual('secret', 'invalid-hash')
    ).rejects.toThrow('bcrypt error');
  });
});