export function imageDimensions(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length>=24&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)return {width:view.getUint32(16),height:view.getUint32(20)};
 if(bytes[0]===255&&bytes[1]===216){
  let i=2;
  while(i+4<bytes.length){
   if(bytes[i]!==255)throw Error('Invalid JPEG marker');
   while(bytes[i]===255)i++;
   const marker=bytes[i++];if(marker===217||marker===218)break;
   if(marker===1||marker>=208&&marker<=215)continue;
   const size=view.getUint16(i);if(size<2||i+size>bytes.length)break;
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return {width:view.getUint16(i+5),height:view.getUint16(i+3)};
   i+=size;
  }
 }
 throw Error('Image dimensions could not be verified before decoding.');
}
export function checkImageSize({width,height}){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>10000||height>10000||width*height>16000000)throw Error('Image limit: 16 megapixels, maximum side 10,000 pixels.');}
