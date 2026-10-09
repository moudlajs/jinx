// Test-only: compiles schema/stat.schema.json. Never import from app code.
import Ajv2020 from 'ajv/dist/2020';
import schema from '../../../schema/stat.schema.json';

export const validateStat = new Ajv2020({ allErrors: true }).compile(schema);
