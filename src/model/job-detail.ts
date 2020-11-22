export type Company = {
  name: string;
  link: string;
};

export type Tag = {
  name: string;
  value: string;
};

export type JobDetail = {
  name: string;
  link: string;
  description: string;
  company: Company;
  tags: Tag[];
  technologies: string[];
};
