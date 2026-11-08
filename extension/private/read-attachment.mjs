export async function readAttachment(file,options={}){
 if(/\.(docx|xlsx|pptx)$/i.test(file.name))return (await import('./office.mjs')).readOffice(file,options);
 if(/\.(wav|mp3|m4a|ogg|flac|webm|mp4)$/i.test(file.name))return (await import('./media-text.mjs')).readMedia(file,options);
 if(/\.(png|jpe?g)$/i.test(file.name))return (await import('./image-text.mjs')).readImage(file,options);
 return (await import('./documents.mjs')).readDocument(file,{...options,ocr:true});
}
