export interface UserModel {
  id?: string;
  username: string;
  password: string;
  email?: string;
  mobile?: string;
  admin: boolean;
  breakLock: boolean;
}

export interface ScoutModel {
  id?: string;
  ownerID: string;
  fullName: string;
  dobEpoch: number;
  leader: boolean;
  medicalNotes?: string;
}

export interface SupportModel {
  id?: string;
  ownerID: string;
  fullName: string;
  phoneNumber: string;
  from: string;
  to: string;
}

export interface TeamModel {
  id?: string;
  ownerID: string;
  teamName: string;
  hikeClass?: string;
  section?: string;
  district?: string;
  groupName?: string;
  county?: string;
  activeMobile?: string;
  backupMobile?: string;
  emergencyContactName?: string;
  emergencyContactMobile?: string;
  emergencyContactLandline?: string;
  emergencyContactEmail?: string;
  leaderName?: string;
  paymentAmount: number;
  paymentRecieved: boolean;
  teamSubmitted: boolean;
  campingAtStart: boolean;
  committedToRun: boolean;
}

export interface LogModel {
  id?: string;
  who: string;
  when: string;
  what: string;
}
