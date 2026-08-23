const { ObjectId, Binary } = require('mongodb');

const { create } = require('../../models/image');

describe('create', () => {
  test('should create a document with the correct properties', async () => {
    const docId = '507f1f77bcf86cd799439011';
    const name = 'test.pdf';
    const file = {
      mimeType: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test data'),
    };

    const result = await create(docId, name, file);

    expect(result.doc_id).toEqual(new ObjectId(docId));
    expect(result.name).toBe(name);
    expect(result.mimeType).toBe(file.mimeType);
    expect(result.size).toBe(file.size);
    expect(result.data).toEqual(new Binary(file.buffer));
  });

  test('should convert docId to an ObjectId', async () => {
    const docId = '507f1f77bcf86cd799439011';
    const file = {
      mimeType: 'text/plain',
      size: 5,
      buffer: Buffer.from('hello'),
    };

    const result = await create(docId, 'test.txt', file);

    expect(result.doc_id).toBeInstanceOf(ObjectId);
    expect(result.doc_id.toString()).toBe(docId);
  });

  test('should convert file buffer to Binary', async () => {
    const fileBuffer = Buffer.from('test data');

    const file = {
      mimeType: 'application/octet-stream',
      size: fileBuffer.length,
      buffer: fileBuffer,
    };

    const result = await create(
      '507f1f77bcf86cd799439011',
      'test.bin',
      file
    );

    expect(result.data).toBeInstanceOf(Binary);
    expect(result.data.buffer).toEqual(fileBuffer);
  });

  test('should preserve the file name', async () => {
    const file = {
      mimeType: 'image/png',
      size: 100,
      buffer: Buffer.from('image'),
    };

    const result = await create(
      '507f1f77bcf86cd799439011',
      'my-image.png',
      file
    );

    expect(result.name).toBe('my-image.png');
  });

  test('should preserve mimeType and size', async () => {
    const file = {
      mimeType: 'application/pdf',
      size: 12345,
      buffer: Buffer.from('pdf data'),
    };

    const result = await create(
      '507f1f77bcf86cd799439011',
      'document.pdf',
      file
    );

    expect(result.mimeType).toBe('application/pdf');
    expect(result.size).toBe(12345);
  });
});