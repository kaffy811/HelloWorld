export const feedbackPreferences=['simpler','examples','deeper','related'];
export function feedbackInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Write your suggestion before submitting.');
 const body=typeof input.body==='string'?input.body.trim():'';
 if(body.length<5||body.length>2000)throw new Error('Keep your suggestion between 5 and 2,000 characters.');
 if(typeof input.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.id))throw new Error('Invalid submission. Refresh the page and try again.');
 if(input.preference!=null&&!feedbackPreferences.includes(input.preference))throw new Error('Choose a valid learning preference.');
 return {id:input.id,body,preference:input.preference||null};
}
