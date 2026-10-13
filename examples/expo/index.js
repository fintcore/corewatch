import './instrument';
import { registerRootComponent } from 'expo';
import * as CoreWatch from '@dynamicore/corewatch';

import App from './App';

registerRootComponent(CoreWatch.wrap(App));
