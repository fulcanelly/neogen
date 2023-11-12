import { neogen } from "../src/index"
import { testlib } from "./lib"

describe('neogen.', () => {
  describe('validations.', () => {
    describe('validateRelations()', () => {
      const subject = neogen.validations.validateRelations
      const schemas = [
        { label: 'User', schema: {} },
        { label: 'Post', schema: {} },
      ];

      test('should return no errors for valid relations', () => {
        const relations: neogen.Relation[] = [
          { from: 'User', to: 'Post', direction: 'out', label: 'WRITES', alias: 'author' },
        ];

        const errors = subject(relations, schemas);
        expect(errors).toHaveLength(0);
      });

      test('should return errors for invalid relations', () => {
        const relations: neogen.Relation[] = [
          { from: 'User', to: 'Comment', direction: 'out', label: 'WRITES', alias: 'commenter' },
          { from: 'Article', to: 'Post', direction: 'in', label: 'INCLUDED_IN', alias: 'content' },
        ];

        const errors = subject(relations, schemas);
        expect(errors).toHaveLength(2);
        expect(errors).toEqual([
          { unknownLabel: 'Comment', relation: relations[0] },
          { unknownLabel: 'Article', relation: relations[1] },
        ]);
      });
    });
  })
  describe('model.', () => {
    describe('instance.', () => {
      describe('generatePropTypeExpression()', () => {
        const subject = neogen.model.instance.generatePropTypeExpression

        it('with basic basicType', () => {
          const basicType = 'boolean'

          expect(
            testlib.serialize(subject(basicType))
          ).toEqual('{ type: "boolean" }\n')
        })

        it('with array type', () => {
          const arrayType: neogen.Types = ['boolean', 'number']

          expect(
            testlib.serialize(subject(arrayType))
          ).toEqual('{ type: ["boolean", "number"] }\n')
        })

        it('with neo4j types', () => {
          const complexType: neogen.Types = {
            type: ["string", "boolean"],
            required: false
          }

          expect(
            testlib.serialize(subject(complexType))
          ).toEqual('{\n    type: ["string", "boolean"],\n    required: false\n}\n')
        })
      })
    })
    describe('props.', () => {
      describe('extractTypeFromSchemeType()', () => {
        const subject = neogen.model.props.extractTypeFromSchemeType

        it('with basic basicType', () => {
          const basicType = 'boolean'
          expect(
            testlib.serialize(subject(basicType))
          ).toEqual('boolean\n')

        })

        it('with array type', () => {
          const arrayType: neogen.Types = ['boolean', 'number']
          expect(
            testlib.serialize(subject(arrayType))
          ).toEqual('boolean | number\n')
        })

        it('with neo4j types', () => {
          const complexType: neogen.Types = {
            type: ["string", "boolean"],
            required: false
          }

          expect(
            testlib.serialize(subject(complexType))
          ).toEqual('string | boolean\n')
        })
      })
    })
  })
})
