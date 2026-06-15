jest.mock('@uppy/xhr-upload', () => ({}));
jest.mock('@uppy/aws-s3', () => ({}));
jest.mock('@uppy/transloadit', () => ({}));

import { fetchUploadApiEndpoint } from '../uppy.upload';

describe('fetchUploadApiEndpoint', () => {
  it('rejects non-OK upload responses with the server message', async () => {
    const fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ message: 'Unsupported file type.' }),
    });

    await expect(
      fetchUploadApiEndpoint(fetch, 'complete-multipart-upload', {})
    ).rejects.toThrow('Unsupported file type.');
  });
});
