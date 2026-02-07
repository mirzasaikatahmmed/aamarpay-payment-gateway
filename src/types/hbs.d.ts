declare module 'hbs' {
  import { Handlebars } from 'handlebars';
  const hbs: {
    handlebars: typeof Handlebars;
  };
  export = hbs;
}
