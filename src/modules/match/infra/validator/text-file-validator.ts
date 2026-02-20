import { FileValidator } from '@nestjs/common'

export class TextFileValidator extends FileValidator {
    constructor() {
        super({});
    }

    isValid(file: Express.Multer.File): boolean {
        const isTextMime = file.mimetype === 'text/plain';
        const isTxtExtension = file.originalname.toLowerCase().endsWith('.txt');

        return isTextMime || isTxtExtension;
    }

    buildErrorMessage(): string {
        return 'Validation failed: Only plain text files (.txt) are allowed';
    }
}