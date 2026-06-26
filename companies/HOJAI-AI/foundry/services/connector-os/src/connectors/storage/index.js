/**
 * Storage Connectors - Google Drive, Dropbox, S3, OneDrive, etc.
 */

const storageConnectors = [
  // ============= GOOGLE DRIVE =============
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'storage',
    description: 'Google cloud storage',
    authType: 'oauth2',
    logo: 'google-drive-logo.svg',
    capabilities: ['files', 'folders', 'sharing', 'comments', 'revisions'],
    actions: {
      listFiles: {
        description: 'List files',
        params: ['folderId', 'pageSize', 'q']
      },
      getFile: {
        description: 'Get file metadata',
        params: ['fileId']
      },
      downloadFile: {
        description: 'Download file',
        params: ['fileId']
      },
      createFile: {
        description: 'Create file',
        params: ['name', 'parents', 'content', 'mimeType']
      },
      updateFile: {
        description: 'Update file',
        params: ['fileId', 'fields']
      },
      deleteFile: {
        description: 'Delete file',
        params: ['fileId']
      },
      createFolder: {
        description: 'Create folder',
        params: ['name', 'parents']
      },
      shareFile: {
        description: 'Share file',
        params: ['fileId', 'email', 'role', 'type']
      },
      copyFile: {
        description: 'Copy file',
        params: ['fileId', 'folderId']
      },
      moveFile: {
        description: 'Move file',
        params: ['fileId', 'folderId']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Google Drive access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return {
        results: [
          { id: 'file1', name: 'Document.docx', mimeType: 'application/vnd.google-apps.document' }
        ]
      };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Google Drive`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Google Drive`);
      return { success: true };
    }
  },

  // ============= DROPBOX =============
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'storage',
    description: 'Cloud storage and file sync',
    authType: 'oauth2',
    logo: 'dropbox-logo.svg',
    capabilities: ['files', 'folders', 'sharing', 'paper', 'team-folders'],
    actions: {
      listFolder: {
        description: 'List folder contents',
        params: ['path', 'recursive']
      },
      getMetadata: {
        description: 'Get file/folder metadata',
        params: ['path']
      },
      download: {
        description: 'Download file',
        params: ['path']
      },
      upload: {
        description: 'Upload file',
        params: ['path', 'contents', 'mode']
      },
      createFolder: {
        description: 'Create folder',
        params: ['path']
      },
      delete: {
        description: 'Delete file/folder',
        params: ['path']
      },
      move: {
        description: 'Move file/folder',
        params: ['fromPath', 'toPath']
      },
      copy: {
        description: 'Copy file/folder',
        params: ['fromPath', 'toPath']
      },
      createSharedLink: {
        description: 'Create shared link',
        params: ['path', 'settings']
      },
      listSharedLinks: {
        description: 'List shared links',
        params: ['path']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing Dropbox access token');
      }
      return { success: true, accountId: 'dbid:xxx' };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from Dropbox`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to Dropbox`);
      return { success: true };
    }
  },

  // ============= AWS S3 =============
  {
    id: 'aws-s3',
    name: 'Amazon S3',
    category: 'storage',
    description: 'Amazon cloud storage',
    authType: 'aws_v4',
    logo: 'aws-logo.svg',
    capabilities: ['buckets', 'objects', 'presigned-urls', 'lifecycle', 'versioning'],
    actions: {
      listBuckets: {
        description: 'List all buckets',
        params: []
      },
      listObjects: {
        description: 'List objects in bucket',
        params: ['bucket', 'prefix', 'maxKeys']
      },
      getObject: {
        description: 'Get object',
        params: ['bucket', 'key']
      },
      putObject: {
        description: 'Upload object',
        params: ['bucket', 'key', 'body', 'contentType']
      },
      deleteObject: {
        description: 'Delete object',
        params: ['bucket', 'key']
      },
      deleteObjects: {
        description: 'Delete multiple objects',
        params: ['bucket', 'objects']
      },
      copyObject: {
        description: 'Copy object',
        params: ['sourceBucket', 'sourceKey', 'destBucket', 'destKey']
      },
      getPresignedUrl: {
        description: 'Generate presigned URL',
        params: ['bucket', 'key', 'expiration']
      },
      createBucket: {
        description: 'Create bucket',
        params: ['bucket', 'region']
      },
      deleteBucket: {
        description: 'Delete bucket',
        params: ['bucket']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessKeyId || !credentials.secretAccessKey) {
        throw new Error('Missing AWS credentials');
      }
      return { success: true, buckets: [] };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from AWS S3`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to AWS S3`);
      return { success: true };
    }
  },

  // ============= ONEDRIVE =============
  {
    id: 'onedrive',
    name: 'Microsoft OneDrive',
    category: 'storage',
    description: 'Microsoft cloud storage',
    authType: 'oauth2',
    logo: 'onedrive-logo.svg',
    capabilities: ['files', 'folders', 'sharing', 'versions', 'special-folders'],
    actions: {
      listFiles: {
        description: 'List files',
        params: ['folderId', 'top']
      },
      getFile: {
        description: 'Get file metadata',
        params: ['fileId']
      },
      downloadFile: {
        description: 'Download file',
        params: ['fileId']
      },
      uploadFile: {
        description: 'Upload file',
        params: ['folderId', 'fileName', 'content']
      },
      updateFile: {
        description: 'Update file',
        params: ['fileId', 'fields']
      },
      deleteFile: {
        description: 'Delete file',
        params: ['fileId']
      },
      createFolder: {
        description: 'Create folder',
        params: ['parentId', 'name']
      },
      shareFile: {
        description: 'Share file',
        params: ['fileId', 'recipients', 'message']
      },
      getRecentFiles: {
        description: 'Get recent files',
        params: []
      },
      searchFiles: {
        description: 'Search files',
        params: ['query']
      }
    },
    testConnection: async (credentials, config) => {
      if (!credentials.accessToken) {
        throw new Error('Missing OneDrive access token');
      }
      return { success: true };
    },
    search: async (credentials, params) => {
      return { results: [] };
    },
    pullEntity: async (credentials, config, entity) => {
      console.log(`Pulling ${entity} from OneDrive`);
      return { success: true };
    },
    pushEntity: async (credentials, config, entity) => {
      console.log(`Pushing ${entity} to OneDrive`);
      return { success: true };
    }
  }
];

export default {
  list: storageConnectors
};
