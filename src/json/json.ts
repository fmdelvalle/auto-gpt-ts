import * as fs from 'fs';
import * as path from 'path';
import { IRunParameters } from '../types';
import Ajv from 'ajv';

export function validate_json(config: IRunParameters, json_object: object, schema_name: string): object | null {
    const schemaPath = path.join(__dirname, 'schemas', `${schema_name}.json`);
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);
    const ajv = new Ajv();
    const validator = ajv.compile(schema);

    const is_valid = validator(json_object);
    if (!is_valid) {
        const validationErrors = validator.errors;        
        if (validationErrors && validationErrors.length > 0) {
            console.error('The JSON object is invalid.');
            if (config.has_debug) {
                console.error(JSON.stringify(json_object, null, 4));
                console.error('The following issues were found:');
                validationErrors.forEach((error) => {
                    console.error(`Error: ${error.schemaPath}`);
                });
            }
        }
        return null;
    } else {
        return json_object;
    }
}
