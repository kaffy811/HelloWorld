import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {profileFields, avatarBytes, saveProfile} from '../lib/profile-save.mjs';
const photo = () => sharp({create: {width: 1200, height: 600, channels: 3, background: '#246653'}}).png().toBuffer();
test('profile payload trims required names and ignores owner/privileged fields', () => {
  assert.deepEqual(profileFields({display_name: ' Sam ', first_name: 'Sam', last_name: ' Learner ', id: 'other', onboarding_completed_at: 'forged', avatar_path: 'foreign'}), {display_name: 'Sam', first_name: 'Sam', last_name: 'Learner'});
  assert.throws(() => profileFields({display_name: 'Sam', first_name: 'Sam'}));
  assert.throws(() => profileFields({display_name: 'x'.repeat(41), first_name: 'Sam', last_name: 'Learner'}));
});
test('avatars are resized, orientation corrected and original metadata stripped', async () => {
  const bytes = await sharp({create: {width: 600, height: 1200, channels: 3, background: '#246653'}}).withMetadata({orientation: 6}).jpeg().toBuffer();
  const metadata = await sharp(await avatarBytes(bytes)).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 512); assert.equal(metadata.height, 256);
  assert.equal(metadata.exif, undefined); assert.equal(metadata.orientation, undefined);
});
test('fake image data, unsupported SVG and oversized request images are rejected', async () => {
  for (const bytes of [Buffer.from('not a picture'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'), Buffer.alloc(2097153)])
    await assert.rejects(avatarBytes(bytes), /photo could not be read/);
});
function client({failSave = false, failUpload = false} = {}) {
  const state = {uploads: [], removals: [], updates: [], owners: []};
  const s = {storage: {from: bucket => {assert.equal(bucket, 'avatars'); return {
    upload: async (path, bytes, options) => {state.uploads.push({path, bytes, options}); return {error: failUpload ? {} : null};},
    remove: async paths => {state.removals.push(paths); return {error: null};},
  };}}, from: table => {assert.equal(table, 'profiles'); return {update: values => {state.updates.push(values); return {eq: (column, owner) => {assert.equal(column, 'id'); state.owners.push(owner); return {select: column => {assert.equal(column, 'id'); return {single: async () => ({data: failSave ? null : {id: owner}, error: failSave ? {} : null})};}};}};}};}};
  return {s, state};
}
const names = {display_name: 'Sam', first_name: 'Sam', last_name: 'Learner'};
test('new-user photo and profile use the authenticated owner and private Storage', async () => {
  const {s, state} = client(); await saveProfile(s, 'owner-test', {...names, id: 'attacker'}, await photo());
  assert.match(state.uploads[0].path, /^owner-test\/[a-f0-9-]+\.webp$/);
  assert.deepEqual(state.uploads[0].options, {contentType: 'image/webp', upsert: false});
  assert.equal(state.updates[0].avatar_path, state.uploads[0].path); assert.deepEqual(state.owners, ['owner-test']);
  assert.equal(state.removals.length, 0);
});
test('failed profile save rolls back only the newly uploaded photo', async () => {
  const {s, state} = client({failSave: true});
  await assert.rejects(saveProfile(s, 'owner-test', names, await photo()), /profile could not be saved/);
  assert.deepEqual(state.removals, [[state.uploads[0].path]]);
});
test('upload failure preserves profile and continuing without photo preserves current avatar', async () => {
  const failed = client({failUpload: true}); await assert.rejects(saveProfile(failed.s, 'owner-test', names, await photo()), /Photo upload failed/);
  assert.equal(failed.state.updates.length, 0);
  const {s, state} = client(); await saveProfile(s, 'owner-test', names);
  assert.equal(state.uploads.length, 0); assert.deepEqual(state.updates, [names]);
});
