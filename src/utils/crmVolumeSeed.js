/**
 * Large fictional Consultancy CRM dataset for the local demo.
 * Every name, phone, and email is invented. Nothing here is a real person.
 */

import { ADMISSION_STATUSES, DEMO_ACTOR, DEMO_SEED_ACTOR, FOLLOW_UP_STATUSES } from './crmDemoStore.js';

export const VOLUME_STUDENT_COUNT = 800;
export const VOLUME_CONSULTANCY_COUNT = 64;

const FIRST_NAMES = [
  'Asha', 'Meera', 'Karthik', 'Divya', 'Arjun', 'Nisha', 'Rahul', 'Sneha', 'Vikram', 'Ananya',
  'Farhan', 'Ishita', 'Rohan', 'Kavya', 'Aditya', 'Pooja', 'Nikhil', 'Sana', 'Harish', 'Lakshmi',
  'Dev', 'Tara', 'Imran', 'Priya', 'Suresh', 'Neha', 'Amit', 'Riya', 'Kiran', 'Fatima',
  'Varun', 'Shreya', 'Manoj', 'Anjali', 'Yusuf', 'Diya', 'Arun', 'Pallavi', 'Sanjay', 'Nandini',
];

const LAST_NAMES = [
  'Rao', 'Iyer', 'Nair', 'Shah', 'Reddy', 'Menon', 'Khan', 'Patel', 'Das', 'Joshi',
  'Verma', 'Pillai', 'Gupta', 'Banerjee', 'Shetty', 'Kulkarni', 'Chatterjee', 'Naidu', 'Bose', 'Malhotra',
];

const CITIES = [
  'Hyderabad', 'Bengaluru', 'Chennai', 'Pune', 'Mumbai', 'Kochi', 'Vijayawada', 'Warangal',
  'Visakhapatnam', 'Coimbatore', 'Madurai', 'Nagpur', 'Indore', 'Jaipur', 'Lucknow', 'Mysuru',
];

const BRANDS = [
  'Apex', 'Bright Path', 'Cedar', 'Dawn', 'Eastline', 'Foothill', 'Grove', 'Harbor',
  'Ivy', 'Jasper', 'Keystone', 'Lakeside', 'Meridian', 'Northline', 'Oak', 'Pioneer',
  'Quartz', 'Riverbend', 'Summit', 'Tide', 'Unity', 'Valley', 'Westline', 'Amber',
];

const CONTACT_ROLES = ['Owner', 'Counsellor', 'Partner', 'Coordinator'];
const REMARKS = [
  'Asked for the engineering brochure and a callback next week.',
  'Parent wants a campus visit before they decide.',
  'Interested in computer science. Shared the counselling slot list.',
  'Phone rang out. Left a short message.',
  'Requested fee details for the next intake.',
  'Happy with the shortlist. Waiting on documents.',
];

const STATUS_BANDS = [
  ['Not started', 18],
  ['Contacted', 16],
  ['Counselling', 22],
  ['Applied', 16],
  ['Admitted', 12],
  ['Enrolled', 10],
  ['Not proceeding', 6],
];

function pad(value) {
  return String(value).padStart(2, '0');
}

function daysAgo(now, days, hour = 10) {
  const date = new Date(now.getTime());
  date.setHours(hour, Math.abs(days * 13) % 60, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function admissionStatus(index) {
  const slot = index % 100;
  let cursor = 0;
  for (const [status, weight] of STATUS_BANDS) {
    cursor += weight;
    if (slot < cursor) return status;
  }
  return ADMISSION_STATUSES[0];
}

function studentAgeDays(index) {
  const slot = index / VOLUME_STUDENT_COUNT;
  if (slot < 0.28) return index % 30;
  if (slot < 0.55) return 30 + ((index * 17) % 60);
  if (slot < 0.8) return 90 + ((index * 13) % 270);
  return 365 + ((index * 11) % 320);
}

function phoneFrom(start, index) {
  return String(start + index);
}

export function createVolumeState(now = new Date()) {
  const consultancies = [];
  const contacts = [];
  const students = [];
  const referrals = [];
  const followUps = [];
  const remarks = [];
  const audits = [];
  const inactiveFrom = VOLUME_CONSULTANCY_COUNT - 6;

  for (let index = 0; index < VOLUME_CONSULTANCY_COUNT; index += 1) {
    const city = CITIES[index % CITIES.length];
    const brand = BRANDS[Math.floor(index / CITIES.length) % BRANDS.length];
    const name = `${brand} ${city}`;
    const owner = index % 5 === 0 ? DEMO_SEED_ACTOR : DEMO_ACTOR;
    const status = index >= inactiveFrom ? 'inactive' : 'active';
    const followUpStatus = FOLLOW_UP_STATUSES[index % FOLLOW_UP_STATUSES.length];
    const createdAt = daysAgo(now, 400 - index * 3, 9);
    let lastContactAt = null;
    let nextFollowUpAt = null;
    if (followUpStatus === 'Call Scheduled') {
      nextFollowUpAt = daysAgo(now, index % 2 === 0 ? -4 - (index % 10) : 2 + (index % 8), 11);
    } else if (followUpStatus === 'Follow-up Required') {
      nextFollowUpAt = daysAgo(now, index % 2 === 0 ? -2 - (index % 6) : 1 + (index % 5), 15);
    } else if (followUpStatus === 'Call Completed' || followUpStatus === 'Not Lifted') {
      lastContactAt = daysAgo(now, 1 + (index % 12), 16);
    } else if (followUpStatus === 'Interested' || followUpStatus === 'On Hold') {
      lastContactAt = daysAgo(now, 3 + (index % 9), 14);
      nextFollowUpAt = daysAgo(now, -6 - (index % 7), 11);
    }
    const id = `con_${1000 + index}`;
    consultancies.push({
      id,
      name,
      normalizedName: name.toLowerCase(),
      status,
      notes: `Fictional ${city} counselling desk used to preview the CRM.`,
      createdById: DEMO_ACTOR.id,
      createdByName: DEMO_ACTOR.name,
      ownerId: owner.id,
      ownerName: owner.name,
      followUpStatus,
      lastContactAt,
      nextFollowUpAt,
      createdAt,
      updatedAt: lastContactAt || createdAt,
    });

    const contactCount = index % 4 === 0 ? 3 : 2;
    for (let contactIndex = 0; contactIndex < contactCount; contactIndex += 1) {
      const contactNumber = contacts.length;
      const contactName = `${FIRST_NAMES[(index + contactIndex) % FIRST_NAMES.length]} ${LAST_NAMES[(index * 3 + contactIndex) % LAST_NAMES.length]}`;
      const emailOnly = contactIndex === 1 && index % 5 === 0;
      contacts.push({
        id: `ct_${3000 + contactNumber}`,
        consultancyId: id,
        name: contactName,
        phone: emailOnly ? null : phoneFrom(8000000000, contactNumber),
        email: emailOnly || contactIndex === 0 ? `${contactName.toLowerCase().replace(/\s+/g, '.')}@example.com` : '',
        role: CONTACT_ROLES[contactIndex % CONTACT_ROLES.length],
        status: contactIndex === 2 && index % 8 === 0 ? 'inactive' : 'active',
        deactivatedAt: contactIndex === 2 && index % 8 === 0 ? daysAgo(now, 20, 12) : null,
        createdAt,
        updatedAt: createdAt,
      });
    }

    const primary = contacts.find((row) => row.consultancyId === id && row.status === 'active');
    for (let history = 0; history < 2; history += 1) {
      const stamp = daysAgo(now, 2 + history * 6 + (index % 4), 11);
      followUps.push({
        id: `fu_${5000 + index * 2 + history}`,
        consultancyId: id,
        contactId: primary ? primary.id : null,
        type: history === 0 ? 'call' : 'follow_up',
        status: history === 0 ? 'Call Completed' : followUpStatus,
        scheduledAt: nextFollowUpAt,
        completedAt: history === 0 ? stamp : null,
        outcome: history === 0 ? 'Spoke' : '',
        nextAction: followUpStatus === 'Follow-up Required' ? 'Send the shortlist' : '',
        reason: followUpStatus === 'Not Interested' ? 'Paused admissions this season' : '',
        notes: REMARKS[(index + history) % REMARKS.length],
        actorId: owner.id,
        actorName: owner.name,
        createdAt: stamp,
      });
      remarks.push({
        id: `rm_${7000 + index * 2 + history}`,
        consultancyId: id,
        text: REMARKS[(index + history) % REMARKS.length],
        authorId: DEMO_ACTOR.id,
        authorName: DEMO_ACTOR.name,
        createdAt: stamp,
        updatedAt: stamp,
        previousText: null,
        history: [],
      });
    }
  }

  const activeIds = consultancies.filter((row) => row.status === 'active').map((row) => row.id);
  const inactiveIds = consultancies.filter((row) => row.status === 'inactive').map((row) => row.id);
  const contactsByConsultancy = new Map();
  contacts.forEach((contact) => {
    if (contact.status !== 'active') return;
    const list = contactsByConsultancy.get(contact.consultancyId) || [];
    list.push(contact);
    contactsByConsultancy.set(contact.consultancyId, list);
  });

  for (let index = 0; index < VOLUME_STUDENT_COUNT; index += 1) {
    const first = FIRST_NAMES[index % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
    const fullName = `${first} ${last} ${pad((index % 97) + 1)}`;
    const age = studentAgeDays(index);
    const createdAt = daysAgo(now, age, 8 + (index % 10));
    const city = CITIES[index % CITIES.length];
    const status = index < 8 ? (index % 2 === 0 ? 'Contacted' : 'Counselling') : admissionStatus(index);
    const id = `st_${20000 + index}`;
    students.push({
      id,
      fullName,
      phone: phoneFrom(9100000000, index),
      email: index % 4 === 0 ? '' : `${first}.${last}.${index}@example.com`.toLowerCase(),
      city,
      notes: index % 3 === 0 ? `Fictional ${city} student exploring engineering options.` : '',
      admissionStatus: status,
      createdAt,
      updatedAt: createdAt,
    });

    if (index < 8) continue;
    const corrected = index % 23 === 0;
    const useInactive = index % 17 === 0;
    const consultancyId = useInactive
      ? inactiveIds[index % inactiveIds.length]
      : activeIds[index % activeIds.length];
    const consultancy = consultancies.find((row) => row.id === consultancyId);
    const contact = (contactsByConsultancy.get(consultancyId) || [])[0] || null;
    const original = corrected
      ? consultancies.find((row) => row.id === activeIds[(index + 3) % activeIds.length])
      : consultancy;
    const referredAt = daysAgo(now, Math.max(0, age - (index % 4)), 12);
    referrals.push({
      id: `ref_${30000 + index}`,
      crmStudentId: id,
      studentName: fullName,
      consultancyId: consultancy.id,
      consultancyName: consultancy.name,
      consultancyContactId: contact ? contact.id : null,
      contactName: contact ? contact.name : '',
      originalConsultancyId: original.id,
      originalConsultancyName: original.name,
      createdAt: referredAt,
      updatedAt: corrected ? daysAgo(now, Math.max(0, age - (index % 4) - 1), 13) : referredAt,
      sourceCorrectedAt: corrected ? daysAgo(now, Math.max(0, age - (index % 4) - 1), 13) : null,
      sourceCorrectedBy: corrected ? 'Demo manager' : null,
    });
  }

  const recentStudents = students.slice(-12);
  recentStudents.forEach((student, index) => {
    audits.push({
      id: `audit_${8000 + index}`,
      action: 'student.created',
      entityType: 'student',
      entityId: student.id,
      actorLabel: 'Demo seed',
      reason: '',
      before: null,
      after: { fullName: student.fullName, phone: student.phone },
      createdAt: daysAgo(now, index % 3, 18 - (index % 6)),
    });
  });
  consultancies.slice(0, 8).forEach((consultancy, index) => {
    audits.push({
      id: `audit_${8100 + index}`,
      action: 'consultancy.follow_up',
      entityType: 'consultancy',
      entityId: consultancy.id,
      actorLabel: consultancy.ownerName,
      reason: '',
      before: { followUpStatus: 'Pending' },
      after: { followUpStatus: consultancy.followUpStatus, consultancyName: consultancy.name },
      createdAt: daysAgo(now, index % 5, 17),
    });
  });
  audits.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return {
    version: 2,
    seq: 90000,
    demoManager: true,
    demoRole: 'super_admin',
    consultancies,
    contacts,
    students,
    referrals,
    followUps,
    remarks,
    audits,
  };
}
