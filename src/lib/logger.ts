type LogContext = Record<string, unknown>;

const TAG_STYLE = 'color:#72A0C1;font-weight:bold';
const RESET_STYLE = 'color:inherit;font-weight:normal';

export const logger = {
  info(message: string, context?: LogContext) {
    console.info(`%c[MetaMe]%c ${message}`, TAG_STYLE, RESET_STYLE, context ?? '');
  },
  warn(message: string, context?: LogContext) {
    console.warn(`%c[MetaMe]%c ${message}`, TAG_STYLE, RESET_STYLE, context ?? '');
  },
  error(message: string, error: unknown, context?: LogContext) {
    console.error(`%c[MetaMe]%c ${message}`, TAG_STYLE, RESET_STYLE, context ?? '');
    if (error != null) {
      console.error(error);
    }
  },
};
