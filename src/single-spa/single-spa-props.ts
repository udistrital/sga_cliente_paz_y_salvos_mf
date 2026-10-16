import { ReplaySubject } from 'rxjs';
import { AppProps } from 'single-spa';

export const singleSpaPropsSubject = new ReplaySubject<SingleSpaProps>(1);

// Define las propiedades compartidas que recibe el microfrontend de single-spa.
export type SingleSpaProps = AppProps & {};
