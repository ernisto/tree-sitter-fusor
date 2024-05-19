/* eslint-disable arrow-parens */
/* eslint-disable-next-line spaced-comment */
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

let list = (element, sep = ',') => choice(seq(element, repeat(seq(sep, element))), optional(element))
let list1 = element => seq(element, repeat(seq(',', element))) //seq(element, repeat(seq(',', element)))

let biop = ($, level, label) => prec.left(level, seq(field('left', $._expr), label, field('right', $._expr)))

module.exports = grammar({
    name: 'fusor',
    word: $ => $.identifier,
    extras: $ => [
        /\s/,
        $.comment,
    ],
    supertypes: $ => [ $._expr, $._stat ],
    conflicts: $ => [
        [$._stat,   $._expr],
        [$._def,    $._expr],
        [           $._expr,    $.assignment],
        [$._path,               $.assignment],
        [$.do_cond],
        [$.var_def],
        [$.number],
        [$.binding],
    ],
    rules: {
        source_file: $ => seq(
            optional(seq('package', field('package', $._path))),
            field('stats', repeat($._stat)),
        ),
        identifier: () => /[A-Za-z_][A-Za-z0-9_]*/,
        // lifetime: $ => /[A-Za-z_][A-Za-z0-9_]*'/,

        _path: $ => choice($.read, $.read_prop),
        read: $ => field('name', $.identifier),
        read_prop: $ => seq(field('base', $._path), '.', field('name', $.identifier)),
        
        comment: $ => token(choice(
            /\/{2,3}[^/].*/,
            /\/\*{1,}[^*]*\*+([^/*][^*]*\*+)*\//,
        )),
        
        _decorator: $ => seq('@', choice($.callment, $._path)),
        _destructure: $ => seq('(', list1(field('destructures', $.binding)), ')'),
        binding: $ => seq(
            field('decorators', repeat($._decorator)),
            // optional(field('lifetime', $.lifetime)),
            field('name', $.identifier),
            optional(seq('as', field('rename', $.identifier))),
            optional($._destructure),
            optional(choice(field('isOptional', '?'), field('isVariadic', '...'))),
            optional(seq(':', field('type', optional($._expr)))),
            optional(seq('=', field('default', $._expr)))
        ),
        field: $ => seq(field('name', $.identifier), '=', field('value', $._expr)),

        // statement
        _stat: $ => choice(
            $._def, $.callment, $.assignment,
            $.if, $.match, $.for_each, $.cond_do, $.do_cond
        ),
        assignment: $ => seq(
            field('base', choice($.read, $.read_prop, $.subscript)),
            optional($._destructure),
            '=', field('value', $._expr)
        ),
        case: $ => seq('case', field('expr', $._expr), field('then', $._body)),
        match: $ => seq(
            'match', field('expr',  $._expr), '{',
            field('cases', repeat($.case)),
            optional(seq(prec.left('else'), field('else', $._body))),
            '}'
        ),
        first_clause: $ => seq('if', field('clause', $._expr), optional('then'), field('then', $._body)),
        clause: $ => seq('elseif', field('clause', $._expr), optional('then'), field('then', $._body)),
        if: $ => prec.right(seq(
            field('clause', $.first_clause),
            field('clauses', repeat($.clause)),
            optional(seq('else', field('else', $._body))),
        )),
        for_each: $ => seq(
            'for', list1(field('bindings', $.binding)),
            'in', field('target', $._expr),
            optional('do'), field('body', $._body)
        ),
        _cond: $ => choice($.while_cond, $.until_cond),
        while_cond: $ => seq('while', field('expr', $._expr)),
        until_cond: $ => seq('until', field('expr', $._expr)),
        cond_do: $ => seq($._cond, 'repeat', $._body),
        do_cond: $ => seq(
            'repeat', field('body', $._body),
            optional(field('cond', prec(2, $._cond))),
            optional(seq(prec.left('else'), field('else', $._body)))
        ),

        // def
        _def: $ => choice($.var_def, $.func_def, $.impl_def),
        var_def: $ => seq(
            field('decorators', repeat($._decorator)),
            'let', list1(field('bindings', $.binding))
        ),
        func_def: $ => seq(
            field('decorators', repeat($._decorator)),
            'func', field('self', optional($.tuple)), 
            field('name', $.identifier),
            optional(seq('<', list(field('type_params', $.binding)), '>')),
            '(', list(field('params', $.binding)), ')',
            optional(seq('->',
                // optional(field('lifetime', $.lifetime)),
                field('return_type', $._path)
            )),
            field('body', $._body),
        ),
        impl_def: $ => seq(
            'impl', optional(field('base', $._path)),
            'for', field('target', $._path),
            '{', repeat($._def), '}',
        ),

        // expr
        _expr: $ => choice(
            $._literal, $._path,
            $.if, $.match,
            $.var_def, $.func_def,
            $.subscript, $.callment,
            $.expect, $.guard,
            $.pow,
            $.abs, $.neg,
            $.fdiv, $.mod, $.div, $.mul,
            $.add, $.sub,
            $.bnot,
            $.brot, $.bshl, $.bshr,
            $.band, $.bxor, $.bor,
            $.not,
            $.eq, $.df, $.le, $.ge, $.lt, $.gt,
            $.and, $.nand,
            $.xor, $.xnor,
            $.or, $.nor,
        ),
        subscript: $ => prec(16, seq(field('base', $._expr), '[', list1(field('indexes', $._expr)), ']')),
        callment: $ => prec(15, seq(
            field('base', $._expr),
            // optional(seq('<', field('fields', list1($._expr)), '>')),
            field('param', choice($.string, $.tuple, $.scope, $.func))
        )),
        expect: $ => prec(15, seq(field('base', $._expr), '!')),
        guard: $ => prec(15, seq(field('base', $._expr), '?')),

        // biops
        pow: $ => prec.right(14, seq(field('left', $._expr), '^', field('right', $._expr))),

        abs: $ => prec(13, seq('+', field('base', $._expr))),
        neg: $ => prec(13, seq('-', field('base', $._expr))),
        
        fdiv: $ => biop($, 12, ':'),
        mod: $ => biop($, 12, '%'),
        div: $ => biop($, 12, '/'),
        mul: $ => biop($, 12, '*'),
        
        add: $ => biop($, 11, '+'),
        sub: $ => biop($, 11, '-'),
        
        bnot: $ => prec(10, seq('!!', field('base', $._expr))),
        
        brot: $ => biop($, 9, '~~'),
        bshl: $ => biop($, 9, '<<'),
        bshr: $ => biop($, 9, '>>'),
        
        band: $ => biop($, 8, '&&'),
        bxor: $ => biop($, 7, '^^'),
        bor: $ => biop($, 6, '||'),
        
        not: $ => prec(5, seq('not', field('base', $._expr))),
        
        eq: $ => biop($, 4, '=='),
        df: $ => biop($, 4, '!='),
        le: $ => biop($, 4, '<='),
        ge: $ => biop($, 4, '>='),
        lt: $ => biop($, 4, '<'),
        gt: $ => biop($, 4, '>'),

        and: $ => biop($, 3, 'and'),
        nand: $ => biop($, 3, 'nand'),

        xor: $ => biop($, 2, 'xor'),
        xnor: $ => biop($, 2, 'xnor'),

        or: $ => biop($, 1, 'or'),
        nor: $ => biop($, 1, 'nor'),

        // literals
        _literal: $ => prec(17, choice($.boolean, $.undefined, $.null, $.number, $.string, $.tuple, $.scope, $.func)),
        number: $ => seq(
            /(\d+)|(\d*\.\d+)([eE][\+\-]\d+)?/,
            optional(field('type', $.identifier)),
        ),
        boolean: $ => choice('true', 'false'),
        null: $ => 'null',
        undefined: $ => 'undefined',
        tuple: $ => seq('(', list(field('fields', choice($.field, $._expr))), ')'),
        _last_stat: $ => choice($.return, $.break, $.skip),
        skip: $ => seq('skip', /*field('lifetime', $.lifetime)*/),
        break: $ => seq('break', /*field('lifetime', $.lifetime)*/),
        return: $ => seq('return', /*field('lifetime', $.lifetime),*/ field('expr', $._expr)),
        scope: $ => seq(
            '{', repeat(seq(field('stats', $._stat), optional(';'))),
            choice(field('return', $._expr), field('last_stat', $._last_stat)),
            optional(';'), '}',
        ),
        func: $ => seq('|', list(field('params', $.binding)), '|', field('body', $._body)),
        _body: $ => choice(
            seq('=>', field('return', $._expr)),
            $._stat,
            $.scope,
        ),

        // Partial credit to https://github.com/tree-sitter/tree-sitter-javascript/blob/15e85e80b851983fab6b12dce5a535f5a0df0f9c/grammar.js#L906
        string: $ => choice($._string_literal, $._multiline_string_literal),
        _string_literal: $ => seq(
            '"',
            repeat(choice(
                $.string_fragment,
                $._escape_sequence,
            )),
            '"',
        ),
        _multiline_string_literal: $ => seq(
            '"""',
            repeat(choice(
                alias($._multiline_string_fragment, $.multiline_string_fragment),
                $._escape_sequence,
            )),
            '"""',
        ),
        // Workaround to https://github.com/tree-sitter/tree-sitter/issues/1156
        // We give names to the token() constructs containing a regexp
        // so as to obtain a node in the CST.
        //
        string_fragment: () =>
            token.immediate(prec(1, /[^"\\]+/)),
        _multiline_string_fragment: () =>
            prec.right(choice(
                /[^"]+/,
                seq(/"[^"]*"/, repeat(/[^"]+/)),
            )),
        _escape_sequence: $ =>
            choice(
                prec(2, token.immediate(seq('\\', /[^abfnrtvxu'\"\\\?]/))),
                prec(1, $.escape_sequence),
            ),
        escape_sequence: () => token.immediate(seq(
            '\\',
            choice(
                /[^xu0-7]/,
                /[0-7]{1,3}/,
                /x[0-9a-fA-F]{2}/,
                /u[0-9a-fA-F]{4}/,
                /u\{[0-9a-fA-F]+\}/,
            ))),
    },
});