const {Storage} = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const sharp = require('sharp');

    exports.generateThumbnails = async (file, context) => {
        const gcsFile = file;
        const storage = new Storage();
        const sourceBucket = storage.bucket(gcsFile.bucket);
        const finalBucket = storage.bucket('sp-22-41200-rsemla-class-pmap-final');
        const thumbnailBucket = storage.bucket('sp-22-41200-rsemla-class-pmap-thumbnails');

    console.log(`Version: 4.1`);

    console.log(`File name: ${gcsFile.name}`);
    console.log(`Generation number: ${gcsFile.generation}`);
    console.log(`Content type: ${gcsFile.contentType}`);

  // Reject images that are not jpeg or png files
  var fileExtension = "";

  if (gcsFile.contentType === 'image/jpeg') {
    console.log('This is a JPEG file.');
    fileExtension = 'jpg';
  } else if (gcsFile.contentType === 'image/png') {
    console.log('This is a PNG file.');
    fileExtension = 'png';
  } else {
    // Delete the file
    await sourceBucket.file(gcsFile.name).delete(function(err, apiResponse) {
      // This is all of the code that will execute AFTER the file is deleted
      console.log(`Deleted file: ${gcsFile.name}`);
    });
    
    // Bail out of the cloud function entirely
    return false;
  }

  // Create a new filename for the 'final' version of the image file
  // The value of this will be something like '12745649237578595.jpg'
  const finalFileName = `${gcsFile.generation}.${fileExtension}`;

  // Create a working directory on the VM that runs our GCF to download the original file
  // The value of this variable will be something like 'tmp/thumbs'
  const workingDir = path.join(os.tmpdir(), 'thumbs');

  // Create a variable that holds the path to the 'local' version of the file
  // The value of this will be something like 'tmp/thumbs/398575858493.png'
  const tempFilePath = path.join(workingDir, finalFileName);
  console.log(`tempFilePath: ${tempFilePath}`);

  // Wait until the working directory is ready
  await fs.ensureDir(workingDir);
  console.log(`Working directory is ready.`);

  // Download the original file to the path on the 'local' VM
  await sourceBucket.file(gcsFile.name).download({
    destination: tempFilePath
  });
  console.log(`File downloaded to the temp directory.`);

  // Upload our local version of the file to the final images bucket
  await finalBucket.upload(tempFilePath);
  console.log(`File uploaded.`)

  // Delete the original photo from the uploads bucket
  await sourceBucket.file(gcsFile.name).delete();
  console.log(`Deleting image file after upload: ${gcsFile.name}`);

  // THIS IS WHERE THE THUMBNAILS GET GENERATED

  // Declare an array of thumbnail sizes
  const sizes = [64, 256];

  // Use the JS "map" functionality to call a function on each element of the array
  await Promise.all(sizes.map(async size => {
    // This function resizes the image and saves the thumbnail locally

    // Create a name for the thumbnail image
    // The value for this will be something like `thumb@64_384656585.jpg`
    const thumbName = `thumb@${size}_${finalFileName}`;
    console.log(`Thumb name: ${thumbName}`);

    // Create a path where we will store the thumbnail image locally
    // This will be something like `tmp/thumbs/thumb@64_384656585.jpg`
    const thumbPath = path.join(workingDir, thumbName);
    console.log(`Thumb path: ${thumbPath}`);

    // Use the sharp library to generate the thumbnail image and save it to the thumbPath
    await sharp(tempFilePath).resize(size).toFile(thumbPath).then(async (data) => {
      console.log(`Resize complete: ${thumbName}`);
      await thumbnailBucket.upload(thumbPath);
      console.log(`Upload complete: ${thumbName}`);      
    })

  }));

  // Delete our temp working directory and its files from the GCF's VM
  await fs.remove(workingDir);
  console.log(`Deleted the working directory.`);

};