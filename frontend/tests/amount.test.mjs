import test from 'node:test';
import assert from 'node:assert/strict';
import {formatIndianAmount,rawAmount,amountError} from '../src/utils/amount.ts';
test('Indian grouping preserves exact decimals and empty placeholders',()=>{
 for(const [input,expected] of [['',''],['0','0'],['1000','1,000'],['125000','1,25,000'],['12345678.90','1,23,45,678.90'],['100000.','1,00,000.']])assert.equal(formatIndianAmount(input),expected);
 assert.equal(rawAmount('₹ 1,25,000.50'),'125000.50');
});
test('Validation retains numeric limits after switching to formatted text',()=>{
 assert.equal(amountError('1000.50','0.01','5000'),'');
 assert.notEqual(amountError('0','0.01'),'');
 assert.notEqual(amountError('5001',0,5000),'');
 assert.notEqual(amountError('1.234'),'');
 assert.notEqual(amountError('abc'),'');
});
