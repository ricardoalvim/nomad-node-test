import { TextFileValidator } from '../text-file-validator'

describe('TextFileValidator', () => {
    let validator: TextFileValidator

    beforeEach(() => {
        validator = new TextFileValidator()
    })

    it('should validate plain text files with .txt extension', () => {
        const file = {
            mimetype: 'text/plain',
            originalname: 'game-log.txt',
        } as Express.Multer.File

        expect(validator.isValid(file)).toBe(true)
    })

    it('should validate files with .txt extension even if mimetype is different', () => {
        const file = {
            mimetype: 'application/octet-stream',
            originalname: 'game-log.TXT',
        } as Express.Multer.File

        expect(validator.isValid(file)).toBe(true)
    })

    it('should validate files with text/plain mimetype even without .txt extension', () => {
        const file = {
            mimetype: 'text/plain',
            originalname: 'game-log',
        } as Express.Multer.File

        expect(validator.isValid(file)).toBe(true)
    })

    it('should reject files that are neither text/plain nor .txt', () => {
        const file = {
            mimetype: 'application/pdf',
            originalname: 'game-log.pdf',
        } as Express.Multer.File

        expect(validator.isValid(file)).toBe(false)
    })

    it('should build proper error message on validation failure', () => {
        const errorMessage = validator.buildErrorMessage()
        expect(errorMessage).toContain('Only plain text files')
        expect(errorMessage).toContain('.txt')
    })

    it('should be case-insensitive for file extension', () => {
        const fileUppercase = {
            mimetype: 'application/octet-stream',
            originalname: 'LOG.TXT',
        } as Express.Multer.File

        const fileMixed = {
            mimetype: 'application/octet-stream',
            originalname: 'log.Txt',
        } as Express.Multer.File

        expect(validator.isValid(fileUppercase)).toBe(true)
        expect(validator.isValid(fileMixed)).toBe(true)
    })
})
