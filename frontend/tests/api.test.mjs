import test from 'node:test';
import assert from 'node:assert/strict';
import {request,ApiError} from '../src/services/api.ts';
test('API client turns plain-text server errors into actionable failures',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('Internal Server Error',{status:500});
 try{await assert.rejects(()=>request('/test'),error=>error instanceof ApiError&&error.status===500&&error.message.includes('Please retry'))}finally{globalThis.fetch=original}
});
test('API client rejects malformed successful JSON instead of reporting success',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('<html>unexpected</html>',{status:200});
 try{await assert.rejects(()=>request('/test'),error=>error instanceof ApiError&&error.message.includes('unexpected response'))}finally{globalThis.fetch=original}
});
