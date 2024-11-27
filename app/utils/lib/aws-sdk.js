const { PutObjectCommand, S3Client, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { createPresignedPost } = require('@aws-sdk/s3-presigned-post');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const axios = require('axios');

class AwsSdk {
  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESSKEYID,
        secretAccessKey: process.env.AWS_SECRETKEY,
      }
    });
  }

  /**
   * @param sFileName file name
   * @param sContentType content type of file
   * @param path path to store image
   * @param isModified modified
   * @param sBucketName name of the bucket
   * @description Create url for image there you can store your image.
   *
   */
  async createSignedURL(sFileName, sContentType, path, isModified = false, sBucketName) {
    try {
      sFileName = sFileName.replace('/', '-');
      sFileName = sFileName.replace(/\s/gi, '-');

      if (!isModified) sFileName = `Date-With-Ludo_${Date.now()}_${sFileName}`;

      return {
        sUrl: await getSignedUrl(this.client, new PutObjectCommand({ Bucket: sBucketName, Key: path + sFileName, ContentType: sContentType }), { expiresIn: 10000 }),
        sPath: path + sFileName,
      };
    } catch (error) {
      log.error(`Error in createSignedURL ${error.message}`);
    }
  }

  /**
   * @param sPath path to store image
   * @param sBucketName name of the bucket
   * @description Get object from the bucket.
   *
   */
  async getObject(sPath, sBucketName) {
    try {
      return await getSignedUrl(this.client, new GetObjectCommand({ Bucket: sBucketName, Key: sPath }));
    } catch (error) {
      log.error(`Error in getObject ${error.message}`);
    }
  }
  /**
   * @param sPath path to store image
   * @param sBucketName name of the bucket
   * @description Delete object from the bucket.
   *
   */
  async deleteObject(sPath, sBucketName) {
    try {
      return await this.client.send(new DeleteObjectCommand({ Bucket: sBucketName, Key: sPath }));
    } catch (error) {
      log.error(`Error in deleteObject ${error.message}`);
    }
  }

  async putObj(sFileName, sContentType, path, fileStream, sBucketName) {
    try {
      sFileName = sFileName.replace('/', '-');
      sFileName = sFileName.replace(/\s/gi, '-');

      const fileKey = `game-studio-${_.ObjectId()}-${sFileName}`;

      return await this.client.send(
        new PutObjectCommand({
          Bucket: sBucketName,
          Key: path + fileKey,
          ContentType: sContentType,
          Body: fileStream,
        })
      );
    } catch (error) {
      log.error(`Error in putObj ${error.message}`);
    }
  }

  /**
   * @param s3Path  path to upload file
   * @param fileKey file key
   * @param sContentType content type of file
   * @param sBucketName name of the bucket
   * @description Get the form fields and target URL for direct POST uploading.
   *
   */
  async createS3URL(s3Path, fileKey, sContentType, sBucketName) {
    try {
      const params = {
        Bucket: sBucketName,
        Key: s3Path + fileKey,
        Expires: 30000,
        Conditions: [
          ['content-length-range', 0, 1000000],
          ['eq', '$Content-Type', sContentType],
          ['eq', '$key', s3Path + fileKey],
        ],
      };

      const data = await createPresignedPost(this.client, params);
      return { sUrl: data.url, sPath: s3Path + fileKey, oFields: data.fields };
    } catch (error) {
      log.error(`Error in createS3URL ${error.message}`);
    }
  }

  async uploadFromUrlToS3(url, destPath, sBucketName) {
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', responseEncoding: 'binary' });
      const objectParams = {
        ContentType: res.headers['content-type'],
        ContentLength: res.headers['content-length'],
        Key: destPath,
        Body: res.data,
        Bucket: sBucketName,
      };

      return this.client.send(new PutObjectCommand(objectParams));
    } catch (error) {
      log.error(`Error in UploadFromUrlToS3 ${error.message}`);
    }
  }

  async getS3ImageURL(url, path, sBucketName) {
    try {
      const imageURL = url;

      let imageName = imageURL.s(imageURL.lastIndexOf('/') + 1);
      imageName = (imageName.match(/[^.]+(\.[^?#]+)?/) || [])[0];

      const fileExtension = imageName.match(/\.([0-9a-z]+)(?=[?#])|(\.)(?:[\w]+)$/gim)?.[0];
      const fileName = Math.floor(Math.random() * 100000 + 99999).toString();
      const imagePath = path + fileName + fileExtension;
      const res = await this.uploadFromUrlToS3(imageURL, imagePath);

      return {
        sSuccess: res ? true : false,
        sPath: imagePath,
        sUrl: sBucketName + imagePath,
      };
    } catch (error) {
      log.error(`Error in getS3ImageURL ${error.message}`);
    }
  }
}

module.exports = new AwsSdk();

// import { error, log } from '../../common/logger.js';
// import { config } from '../../constant/constant.js';
// import { _ } from '../../utils/utils.js';

// // const { fromIni } = require('@aws-sdk/credential-provider-ini');
// import { PutObjectCommand, S3 } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// const options = {
//   region: config.assets.awsRegion,
//   credentials: {
//     accessKeyId: config.assets.awsAccessKeyId,
//     secretAccessKey: config.assets.awsSecretAccessKey,
//   },
// };

// const s3 = new S3(options);
// // log('aws.config', options);

// export const getSignedUrlImage = async (fileExtension: any) => {
//   try {
//     const actionId = _.uuid();
//     const command = new PutObjectCommand({
//       Bucket: config.assets.s3BucketName,
//       Key: `${config.assets.s3FilePath}/${actionId}.${fileExtension}`,
//       ContentType: `image/jpg`, // Assuming you're uploading images. Adjust this based on actual file type.
//       // ACL:'public-read', // Adjust based on your access policy.
//     });

//     const uploadURL = await getSignedUrl(s3, command, { expiresIn: 300 });
//     return { uploadURL, actionId };
//   } catch (err) {
//     error('[getSignedUrlImage] failed', err);
//     return err;
//   }
// };
