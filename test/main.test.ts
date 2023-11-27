import { neogen } from "../src/index"
import { testlib } from "./lib"

describe('neogen.', () => {
  describe('relation.', () => {
    const subject = neogen.relation.extractRelationsFromDSL

    describe('extractRelationsFromDSL()', () => {
      it('should generate normal relations', () => {
        const dsl = {
          POST_COMMENTED: {
            ChannelPost: 'commented',
            PostComment: 'to_post'
          },
        }

        expect(subject(dsl)).toStrictEqual([
          {
            from: 'ChannelPost',
            to: 'PostComment',
            direction: 'out',
            label: 'POST_COMMENTED',
            alias: 'commented'
          },
          {
            from: 'PostComment',
            to: 'ChannelPost',
            direction: 'in',
            label: 'POST_COMMENTED',
            alias: 'to_post'
          }
        ])
      })

      it('should generate signle relation', () => {
        const dsl = {
          COMMENT_REPLIED_TO: {
            PostComment: 'replied_to'
          }
        }

        expect(subject(dsl)).toStrictEqual([
          {
            from: 'PostComment',
            to: 'PostComment',
            direction: 'out',
            label: 'COMMENT_REPLIED_TO',
            alias: 'replied_to'
          },
        ])
      })

      it('should generate relation to itself', () => {
        const dsl = {
          COMMENT_REPLIED_TO: {
            PostComment: ['replied_to', 'replies']
          }
        }

        expect(subject(dsl)).toStrictEqual([
          {
            from: 'PostComment',
            to: 'PostComment',
            direction: 'out',
            label: 'COMMENT_REPLIED_TO',
            alias: 'replied_to'
          },
          {
            from: 'PostComment',
            to: 'PostComment',
            direction: 'in',
            label: 'COMMENT_REPLIED_TO',
            alias: 'replies'
          }
        ])
      })
    })
  })
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
          { unknownLabel: 'WRITES:Comment', relation: relations[0] },
          { unknownLabel: 'INCLUDED_IN:Article', relation: relations[1] },
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
      describe('generatePropsType()', () => {
        const subject = neogen.model.props.generatePropsType

        it('with basic schema', () => {

          const schema: neogen.Schema = {
            label: "",
            schema: {
              name: 'string'
            }
          }

          expect(
            testlib.serialize(subject(schema))
          ).toBe('export type Props = {\n    name: string\n}\n')
        })

        it('with nullable field, should make optional field ', () => {
          const schema: neogen.Schema = {
            label: "",
            schema: {
              name: ['string', 'null']
            }
          }

          expect(
            testlib.serialize(subject(schema))
          ).toBe('export type Props = {\n    name?: string | undefined\n}\n')
        })
      })

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
