declare module '@nxn_google_buckets' 
{

    // import { GoogleBuckets,GoogleBucketsSce } from "../buckets.service";
    // export { GoogleBuckets,GoogleBucketsSce };

    /**
     * Represents the configuration for the GoogleBuckets service.
     */
    interface GoogleBucketsConfig 
    {
        use_cache?: boolean;
        get_last_if_fails?: boolean;
        upload_file?: boolean;
        keyPath?: string;
        keypath?: string;
        cloud_project_id: string;
        buckets: Record<string, string>;
    }

    /**
     * Represents the interface for the GoogleBuckets class.
     */
    interface GoogleBuckets 
    {
        /**
         * Connects to the Google Cloud Storage service.
         * @returns A boolean indicating if the connection was successful.
         */
        connect(): Promise<boolean>;

        /**
         * Gets the public URL for a file in a bucket.
         * @param bucketName - The name of the bucket.
         * @param filename - The name of the file.
         * @returns The public URL for the file.
         */
        getFileUrl(bucketName: string, filename: string): string;

        /**
         * Gets the URI for a file in a bucket.
         * @param bucketName - The name of the bucket.
         * @param filename - The name of the file.
         * @returns The URI for the file.
         */
        getFileUri(bucketName: string, filename: string): string;

        /**
         * Gets the URI for a bucket with an optional directory.
         * @param bucketName - The name of the bucket.
         * @param dir - Optional directory within the bucket.
         * @returns The URI for the bucket with the directory.
         */
        getBucketUri(bucketName: string, dir?: string): string;

        /**
         * Gets the actual name of a bucket.
         * @param bucketName - The name of the bucket.
         * @returns The actual name of the bucket.
         */
        getBucketName(bucketName: string): string;

        /**
         * Downloads a file from a bucket to a local path.
         * @param bucketName - The name of the bucket.
         * @param fileName - The name of the file.
         * @param localPath - The local path to save the file.
         * @param usecache - Optional flag to use local cache.
         * @returns The local path where the file is saved.
         */
        downloadFileFromBucket(
            bucketName: string,
            fileName: string,
            localPath: string,
            usecache?: boolean
        ): Promise<string>;

        /**
         * Reads files from a bucket and executes a callback for each file.
         * @param bucketName - The name of the bucket.
         * @param cb - Callback function to execute for each file.
         * @param filter - Optional filter for files.
         * @param usecache - Optional flag to use local cache.
         * @param useLastIfFails - Optional flag to use last version if download fails.
         */
        readFiles(
            bucketName: string,
            cb: (
            fileName: string,
            data: any,
            metadata: any,
            currentIndex: number,
            totalFiles: number
            ) => Promise<void>,
            filter?: any,
            usecache?: boolean,
            useLastIfFails?: boolean
        ): Promise<void>;

        /**
         * Reads the data of a file from a bucket.
         * @param bucketName - The name of the bucket.
         * @param fileName - The name of the file.
         * @param usecache - Optional flag to use local cache.
         * @param useLastIfFails - Optional flag to use last version if download fails.
         * @returns The data of the file.
         */
        readFileData(
            bucketName: string,
            fileName: string,
            usecache?: boolean,
            useLastIfFails?: boolean
        ): Promise<any>;

        /**
         * Uploads a file to a bucket.
         * @param localPath - The local path of the file.
         * @param bucketName - The name of the bucket.
         * @param fileName - The name to be given to the file in the bucket.
         */
        uploadFileToBucket(localPath: string, bucketName: string, fileName: string): Promise<void>;

        /**
         * Writes data to a file in a bucket.
         * @param bucketName - The name of the bucket.
         * @param fileName - The name of the file.
         * @param data - The data to be written to the file.
         * @param uploadFile - Optional flag to upload the file.
         */
        writeFileData(bucketName: string, fileName: string, data: any, uploadFile?: boolean): Promise<void>;

        /**
         * Gets the local path for a file in a bucket.
         * @param bucketName - The name of the bucket.
         * @param fileName - The name of the file.
         * @returns The local path for the file.
         */
        getLocalPath(bucketName: string, fileName: string): string;

        /**
         * Gets the bucket and file instances for a file in a bucket.
         * @param bucketName - The name of the bucket.
         * @param fileName - The name of the file.
         * @returns An object with bucket and file instances.
         */
        getBucketFile(bucketName: string, fileName: string): { bucket: any; file: any };
    }

    /**
     * Represents the interface for the GoogleBucketsSce class.
     */
    export class GoogleBucketsSce 
    {
        /**
         * Initializes the GoogleBucketsSce instance with configuration.
         * @param config - The configuration object.
         */
        init(config: GoogleBucketsSceConfig): void;
    
        /**
         * Gets an instance of GoogleBuckets with an optional bucket cache path.
         * @param bucketCachePath - Optional path for the bucket cache.
         * @returns An instance of GoogleBuckets.
         */
        getInstance(bucketCachePath?: string): GoogleBuckets;
    }
    
    /**
     * Represents the configuration for the GoogleBucketsSce service.
     */
    export class GoogleBucketsSceConfig 
    {
        log?: any;
        localPath?: string;
    }    

}
