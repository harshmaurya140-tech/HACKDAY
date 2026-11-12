export async function readAttachment(file,options={}){
 if(/\.(docx|xlsx|pptx)$/i.test(file.name))return (await import('./office.mjs')).readOffice(file,options);
 if(/\.(mp4|webm)$/i.test(file.name))return (await import('./video-text.mjs')).readVideo(file,options);
 if(/\.(wav|mp3|m4a|ogg|flac)$/i.test(file.name))return (await import('./media-text.mjs')).readMedia(file,options);
 if(/\.(png|jpe?g)$/i.test(file.name))return (await import('./image-text.mjs')).readImage(file,options);
 return (await import('./documents.mjs')).readDocument(file,{...options,ocr:true});
}
