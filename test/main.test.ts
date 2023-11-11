import { neogen } from "../src/index"
import { testlib } from "./lib"

describe('neogen.', () => {
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
