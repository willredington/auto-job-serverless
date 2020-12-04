export type EventType = "scrape-listing" | "scrape-detail" | "job-apply";

export interface BaseEvent {
  uuid: string;
  type: EventType;
}

export interface ScrapeJobListingEvent extends BaseEvent {
  search: string;
  location: string;
}

export interface ScrapeJobDetailEvent extends BaseEvent {
  name: string;
  link: string;
}

export interface ApplyJobDetailEvent extends BaseEvent {
  jobDetailId: string;
}
