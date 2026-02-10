/**
 * Database service: public API and error types.
 */
export { DatabaseService } from './DatabaseService';
export {
  type DbErrorKind,
  type DbErrorClassification,
  classifyDbError,
} from './errors';
