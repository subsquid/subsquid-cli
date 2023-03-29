import chalk from 'chalk';

export const mainColor = 'blue';
export const mainLightColor = 'bright-blue';

export const chalkMainColor = chalk.blue;

export const borderBoxTheme = {
  tags: true,
  border: {
    type: 'line' as const,
  },
  style: {
    border: {
      fg: mainColor,
    },
  },
};

export const scrollBarTheme = {
  style: {
    bg: mainLightColor,
  },
  track: {
    bg: mainColor,
  },
};
