export interface HouseholdMember {
  role: 'owner' | 'member';
  name: string;
  joinedAt: Date;
}

export interface Household {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  members: {
    [userId: string]: HouseholdMember;
  };
  createdAt: Date;
} 