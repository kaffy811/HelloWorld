import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const path=process.argv[2];
if(!path)throw new Error('Usage: npm run replay:ai -- /path/to/downloaded-generation.json');
if((await stat(path)).size>200000)throw new Error('This is not a bounded generation record.');
const record=JSON.parse(await readFile(path,'utf8'));
if(record.format_version!==1||!record.output?.content?.answer||!record.generation?.prompt?.prompt_version)throw new Error('Use the JSON exported from a generated explanation.');
// Playback never calls Google, loads environment variables or writes the database.
const output=record.output,run=record.generation;
console.log(JSON.stringify({title:output.content.title,answer:output.content.answer,citations:output.content.citations,prompt_version:run.prompt.prompt_version,model:run.usage?.model_version||run.prompt.model,created_at:output.created_at,content_sha256:createHash('sha256').update(JSON.stringify(output.content)).digest('hex')},null,2));
