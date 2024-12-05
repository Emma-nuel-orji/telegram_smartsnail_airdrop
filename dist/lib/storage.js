"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveReferral = saveReferral;
exports.getReferrals = getReferrals;
exports.getReferrer = getReferrer;
let storage = {
    referrals: {},
    referredBy: {}
};
function saveReferral(userId, referralId) {
    if (!storage.referrals[referralId]) {
        storage.referrals[referralId] = [];
    }
    storage.referrals[referralId].push(userId);
    storage.referredBy[userId] = referralId;
}
function getReferrals(userId) {
    return storage.referrals[userId] || [];
}
function getReferrer(userId) {
    return storage.referredBy[userId] || null;
}
