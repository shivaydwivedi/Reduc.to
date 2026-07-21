import type { RedirectType } from "../../generated/prisma/enums.js";

export type LinkDatabase = {
  link: {
    findUnique: (input: {
      where: { lookupKey?: string; id?: string };
    }) => Promise<LinkRecord | null>;
    findFirst: (input: { where: Partial<LinkRecord> }) => Promise<LinkRecord | null>;
    findMany: (input: {
      where: Partial<LinkRecord>;
      orderBy?: { createdAt: "desc" };
      skip?: number;
      take?: number;
    }) => Promise<LinkRecord[]>;
    count: (input: { where: Partial<LinkRecord> }) => Promise<number>;
    create: (input: { data: LinkCreateData }) => Promise<LinkRecord>;
    update: (input: { where: { id: string }; data: Partial<LinkRecord> }) => Promise<LinkRecord>;
  };
  clickEvent: {
    count: (input: { where: { linkId: string } }) => Promise<number>;
    create: (input: { data: ClickEventCreateData }) => Promise<unknown>;
  };
};

export type LinkRecord = {
  id: string;
  userId: string;
  displayKey: string;
  lookupKey: string;
  destinationUrl: string;
  title: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  redirectType: RedirectType;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type LinkCreateData = Omit<LinkRecord, "createdAt" | "updatedAt" | "deletedAt">;

export type ClickEventCreateData = {
  id: string;
  linkId: string;
  occurredAt: Date;
  referrerHost: string | null;
  isBot: boolean;
  source: string | null;
};

export type LinkResponse = {
  id: string;
  displayKey: string;
  shortUrl: string;
  destinationUrl: string;
  title: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalClicks: number;
};
