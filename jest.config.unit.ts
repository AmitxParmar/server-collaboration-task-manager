import config from './jest.config.js';

const unitConfig: typeof config = {
  ...config,
  testRegex: '(/__tests__/.*|(\\.|/)(unit\\.test))\\.(js?|ts?)?$',
};

export default unitConfig;
