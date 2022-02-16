const {Storage} = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');


exports.generateThumbnails = async (file, context) => {
    const gcsFile = file;
    const storage = new Storage();
    const sourceBucket = storage.bucket(gcsFile.bucket);
    const finalBucket = storage.bucket('sp-22-41200-rsemla-class-pmap-final');
    console.log(`Version: 3.0`);

    console.log(`Processing file: ${gcsFile.name}`);
    console.log(`Generation Number: ${gcsFile.generation}`);
    console.log(`Content Type: ${gcsFile.contentType}`)
 
    //Reject images that are not jpeg or png files
    var fileExtension = "";
    if (gcsFile.contentType === 'image/jpeg'){
        console.log('This is a JPEG file');
        fileExtension = 'jpg';
    } else if (gcsFile.contentType === 'image/png'){
        console.log('This is a PNG file.');
        fileExtension='png';
    } else {
        //Delete the file
        await sourceBucket.file(gcsFile.name).delete(function(err,apiResponse){
            //This is the code that will execute after the file is deleted
            console.log(`Deleted File: ${gcsFile.name}`)
        });
        //Bail out of the could function entirely
        return false;
    }

    //Create a new filename for the final version of the image file
    //The value of this will be like 1322434234.jpg
    const finalFileName = `${gcsFile.generation}.${fileExtension}`

    //Create a working directory on the VM that runs our GCF to download hte original file
    //The value of this variable will be like'tmp/thumbs'
    const workingDir = path.join(os.tmpdir(), 'thumbs');

    //Create a variable that holds the path to the local version of the file
    //The value will be something like 'tmp/thumbs/342432523.png'
    const tempFilePath = path.join(workingDir, finalFileName);
    console.log(`tempFilePath: ${tempFilePath}`);

    //Wait until working directory
    await fs.ensureDir(workingDir);
    console.log(`Working directory is ready.`)

    //Download the original file to the path on the local VM {json} (function) {function details}
    await sourceBucket.file(gcsFile.name).download({
        destination: tempFilePath
    }, () => {
    });
    console.log(`File downloaded to the temp directory.`)
    
    //Upload our local version of the file to the final images bucket
    await finalBucket.upload(tempFilePath);
        console.log(`File uploaded.`);
    

    //Delete the original photo from the uploads bucket
    await sourceBucket.file(gcsFile.name).delete();
        console.log(`Deleting the image file after upload: ${gcsFile.name}`);

};
  


