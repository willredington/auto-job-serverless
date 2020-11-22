export interface BaseEvent {
  uuid: string;
}

export interface ScrapeJobListingEvent extends BaseEvent {
  search: string;
  location: string;
}

export interface ScrapeJobDetailEvent extends BaseEvent {
  name: string;
  link: string;
}
