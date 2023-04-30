interface TypedResult {
  tag: String | undefined;
  type: string;
  value: String | undefined;
  children: TypedResult[];
}

function generateSpaces(numSpaces: number): string {
  return ' '.repeat(numSpaces * 2);
}

type Parser = (level: number, input: string) => Result;

interface Result {
  success: boolean;
  value?: TypedResult;
  remainingInput?: string;
}

function parse(parser: Parser, input: string): Result {
  return parser(0, input);
}

function optional(parser: Parser): Parser {
  return repetition(0, 1, parser);
}

function repetition(min: number, max: number, parser: Parser): Parser {
  return (level: number, input: string) => {
    const results: TypedResult[] = [];
    let remainingInput = input;
    let count = 0;

    while (true) {

      if (max !== 0 && count >= max) {
        break;
      }

      const result = parser(level, remainingInput);

      if (!result.success) {
        break;
      }

      results.push(result.value!);

      remainingInput = result.remainingInput!;

      count++;
    }

    const success = 
      (count >= min && (max === 0 || count <= max));

    return {
      success,
      value: {
        tag: undefined,
        type: "repetition",
        value: undefined,
        children: results
      },
      remainingInput : success ? remainingInput : input
    };
  };
}

function sequence(...parsers: Array<Parser>): Parser {
  return (level: number, input: string): Result => {
    const values: TypedResult[] = [];
    let remainingInput = input;

    for (const parser of parsers) {
      const result = parser(level, remainingInput);
      if (!result.success) {
        return { 
          success: false,
          value: {
            tag: undefined,
            type: "sequence",
            value: undefined,
            children: values
          },
          remainingInput: input,
        };
      }

      values.push(result.value!);
      remainingInput = result.remainingInput!;
    }

    return {
      success: true,
      value: {
        tag: undefined,
        type: "sequence",
        value: undefined,
        children: values
      },
      remainingInput: remainingInput,
    };
  };
}

// choice 関数は、引数に与えられたパーサーのいずれかを適用するパーサーを返します。
function choice(...parsers: Array<Parser>): Parser {
  return (level: number, input: string) => {

    const indent = generateSpaces(level);

    for (const parser of parsers) {

      console.log(`${indent}choice input: "${input}"`);

      const result = parser(level, input);
      if (result.success) {
        console.log(`${indent}choice result: "${result}"`);
        return result;
      }
    }
    return { 
      success: false,
      value: {
        tag: undefined,
        type: "choice",
        value: undefined,
        children: undefined
      },
      remainingInput: input,
    };
  };
}

function parserHex1(s: number): Parser {
  return (level: number, input: string) => {
    if (input.length === 0) {
      return { 
        success: false,
        value: {
          tag: undefined,
          type: "hex1",
          value: undefined,
          children: []
        },
        remainingInput: input
      };
    }

    const code = input.charCodeAt(0);

    const success = (s === code);

    return {
        success,
        value: {
          tag: undefined,
          type: "hex1",
          value: input[0],
          children: []
        },
        remainingInput: success ? input.slice(1) : input
      };
  };
};

function parserHex2(s1: number, s2: number): Parser {
  return (level: number, input: string) => {
    if (input.length === 0) {
      return { 
        success: false,
        value: {
          tag: undefined,
          type: "hex2",
          value: undefined,
          children: []
        },
        remainingInput: input
      };
    }

    const code = input.charCodeAt(0);

    const success = (s1 <= code && code <= s2);

    return {
        success,
        value: {
          tag: undefined,
          type: "hex2",
          value: input[0],
          children: []
        },
        remainingInput: success ? input.slice(1) : input
      };
  };
};

function parserAny(s: string): Parser {

  const s_len = s.length;

  return (level: number, input: string) => {
    if (input.length < s_len) {
      return { 
        success: false,
        value: {
          tag: undefined,
          type: "any",
          value: undefined,
          children: []
        },
        remainingInput: input
      };
    }

    const t = input.slice(0, s_len);

    const success = t === s;

    return {
        success,
        value: {
          tag: undefined,
          type: "any",
          value: t,
          children: []
        },
        remainingInput: success ? input.slice(s_len) : input
      };
  };
}

function parserTest() {
  return sequence(
    parserAny("ab"),
    parserAny("ab")
  );
}


function test( p: Parser, input: string ) {
  const result = parse(p, input);
  if (result.success) {
    console.log(`Parsing succeeded! Parsed value: ${JSON.stringify(result.value)}`);
    console.log(`remainingInput: "${result.remainingInput}"`);
  } else {
    console.log(`Parsing failed! Remaining input: "${result.remainingInput}"`);
  }
}

//test('ababab gt 0');
test(parserAToF,'ComplianceStatuses/any(d:d/Compliant eq false)');

function addName( s: string, p: Parser ) : Parser  {
  return (level : number , input: string) => {

    const indent = generateSpaces(level);

    console.log(`${indent}addName in {${s}} input: "${input}"`);

    const result : Result = p(1 + level, input);

    console.log(`${indent}addName out {${s}} result: "${JSON.stringify(result)}"`);

    const success = result.success;

    return {
      success,
      value: {
        tag : s,
        type: result.value?.type,
        value: result.value?.value,
        children: result.value?.children
      },
      remainingInput : success ? result.remainingInput : input
    };
  };
}


//////////////////////////////////////////////////////////////////////////////////////////////////////

function parserAToF(level : number , input: string) { return addName("A-to-F",choice((sequence((parserAny("A")))),(sequence((parserAny("B")))),(sequence((parserAny("C")))),(sequence((parserAny("D")))),(sequence((parserAny("E")))),(sequence((parserAny("F"))))))(level, input); }
function parserAlpha(level : number , input: string) { return addName("ALPHA",choice((sequence((parserHex2(0x41,0x5A)))),(sequence((parserHex2(0x61,0x7A))))))(level, input); }
function parserAt(level : number , input: string) { return addName("AT",choice((sequence((parserAny("@")))),(sequence((parserAny("%40"))))))(level, input); }
function parserBws(level : number , input: string) { return addName("BWS",sequence((repetition(0,0,sequence((choice((sequence((parserSp))),(sequence((parserHtab))),(sequence((parserAny("%20")))),(sequence((parserAny("%09")))))))))))(level, input); }
function parserClose(level : number , input: string) { return addName("CLOSE",choice((sequence((parserAny(")")))),(sequence((parserAny("%29"))))))(level, input); }
function parserColon(level : number , input: string) { return addName("COLON",choice((sequence((parserAny(":")))),(sequence((parserAny("%3A"))))))(level, input); }
function parserComma(level : number , input: string) { return addName("COMMA",choice((sequence((parserAny(",")))),(sequence((parserAny("%2C"))))))(level, input); }
function parserDigit(level : number , input: string) { return addName("DIGIT",sequence((parserHex2(0x30,0x39))))(level, input); }
function parserDquote(level : number , input: string) { return addName("DQUOTE",sequence((parserHex1(0x22))))(level, input); }
function parserEq(level : number , input: string) { return addName("EQ",sequence((parserAny("="))))(level, input); }
function parserHexdig(level : number , input: string) { return addName("HEXDIG",choice((sequence((parserDigit))),(sequence((parserAToF)))))(level, input); }
function parserHtab(level : number , input: string) { return addName("HTAB",sequence((parserHex1(0x09))))(level, input); }
function parserOpen(level : number , input: string) { return addName("OPEN",choice((sequence((parserAny("(")))),(sequence((parserAny("%28"))))))(level, input); }
function parserRws(level : number , input: string) { return addName("RWS",sequence((repetition(1,0,sequence((choice((sequence((parserSp))),(sequence((parserHtab))),(sequence((parserAny("%20")))),(sequence((parserAny("%09")))))))))))(level, input); }
function parserSemi(level : number , input: string) { return addName("SEMI",choice((sequence((parserAny(";")))),(sequence((parserAny("%3B"))))))(level, input); }
function parserSign(level : number , input: string) { return addName("SIGN",choice((sequence((parserAny("+")))),(sequence((parserAny("%2B")))),(sequence((parserAny("-"))))))(level, input); }
function parserSp(level : number , input: string) { return addName("SP",sequence((parserHex1(0x20))))(level, input); }
function parserSquote(level : number , input: string) { return addName("SQUOTE",choice((sequence((parserAny("'")))),(sequence((parserAny("%27"))))))(level, input); }
function parserSquoteInString(level : number , input: string) { return addName("SQUOTE-in-string",sequence((parserSquote),(parserSquote)))(level, input); }
function parserAbstractspatialtypename(level : number , input: string) { return addName("abstractSpatialTypeName",choice((sequence((parserAny("Geography")))),(sequence((parserAny("Geometry"))))))(level, input); }
function parserAddexpr(level : number , input: string) { return addName("addExpr",sequence((parserRws),(parserAny("add")),(parserRws),(parserCommonexpr)))(level, input); }
function parserAllexpr(level : number , input: string) { return addName("allExpr",sequence((parserAny("all")),(parserOpen),(parserBws),(parserLambdavariableexpr),(parserBws),(parserColon),(parserBws),(parserLambdapredicateexpr),(parserBws),(parserClose)))(level, input); }
function parserAndexpr(level : number , input: string) { return addName("andExpr",sequence((parserRws),(parserAny("and")),(parserRws),(parserBoolcommonexpr)))(level, input); }
function parserAnnotation(level : number , input: string) { return addName("annotation",sequence((parserAt),(optional(sequence((parserNamespace),(parserAny("."))))),(parserTermname),(optional(sequence((parserAny("#")),(parserAnnotationqualifier))))))(level, input); }
function parserAnnotationexpr(level : number , input: string) { return addName("annotationExpr",sequence((parserAnnotation),(optional(choice((sequence((parserCollectionpathexpr))),(sequence((parserSinglenavigationexpr))),(sequence((parserComplexpathexpr))),(sequence((parserPrimitivepathexpr))))))))(level, input); }
function parserAnnotationinuri(level : number , input: string) { return addName("annotationInUri",sequence((parserQuotationMark),(parserAt),(parserNamespace),(parserAny(".")),(parserTermname),(parserQuotationMark),(parserNameSeparator),(choice((sequence((parserComplexinuri))),(sequence((parserComplexcolinuri))),(sequence((parserPrimitiveliteralinjson))),(sequence((parserPrimitivecolinuri)))))))(level, input); }
function parserAnnotationqualifier(level : number , input: string) { return addName("annotationQualifier",sequence((parserOdataidentifier)))(level, input); }
function parserAnyexpr(level : number , input: string) { return addName("anyExpr",sequence((parserAny("any")),(parserOpen),(parserBws),(optional(sequence((parserLambdavariableexpr),(parserBws),(parserColon),(parserBws),(parserLambdapredicateexpr)))),(parserBws),(parserClose)))(level, input); }
function parserArrayorobject(level : number , input: string) { return addName("arrayOrObject",choice((sequence((parserComplexcolinuri))),(sequence((parserComplexinuri))),(sequence((parserRootexprcol))),(sequence((parserPrimitivecolinuri)))))(level, input); }
function parserBase64b16(level : number , input: string) { return addName("base64b16",sequence((repetition(2,2,sequence((parserBase64char),(choice((sequence((parserAny("A")))),(sequence((parserAny("E")))),(sequence((parserAny("I")))),(sequence((parserAny("M")))),(sequence((parserAny("Q")))),(sequence((parserAny("U")))),(sequence((parserAny("Y")))),(sequence((parserAny("c")))),(sequence((parserAny("g")))),(sequence((parserAny("k")))),(sequence((parserAny("o")))),(sequence((parserAny("s")))),(sequence((parserAny("w")))),(sequence((parserAny("0")))),(sequence((parserAny("4")))),(sequence((parserAny("8")))))),(optional(sequence((parserAny("="))))))))))(level, input); }
function parserBase64b8(level : number , input: string) { return addName("base64b8",sequence((parserBase64char),(choice((sequence((parserAny("A")))),(sequence((parserAny("Q")))),(sequence((parserAny("g")))),(sequence((parserAny("w")))))),(optional(sequence((parserAny("==")))))))(level, input); }
function parserBase64char(level : number , input: string) { return addName("base64char",choice((sequence((parserAlpha))),(sequence((parserDigit))),(sequence((parserAny("-")))),(sequence((parserAny("_"))))))(level, input); }
function parserBeginArray(level : number , input: string) { return addName("begin-array",sequence((parserBws),(choice((sequence((parserAny("[")))),(sequence((parserAny("%5B")))))),(parserBws)))(level, input); }
function parserBeginObject(level : number , input: string) { return addName("begin-object",sequence((parserBws),(choice((sequence((parserAny("{")))),(sequence((parserAny("%7B")))))),(parserBws)))(level, input); }
function parserBinary(level : number , input: string) { return addName("binary",sequence((parserAny("binary")),(parserSquote),(parserBinaryvalue),(parserSquote)))(level, input); }
function parserBinaryvalue(level : number , input: string) { return addName("binaryValue",sequence((repetition(0,0,sequence((sequence((repetition(4,4,sequence((parserBase64char)))))),(optional(choice((sequence((parserBase64b16))),(sequence((parserBase64b8)))))))))))(level, input); }
function parserBoolcommonexpr(level : number , input: string) { return addName("boolCommonExpr",sequence((parserCommonexpr)))(level, input); }
function parserBoolmethodcallexpr(level : number , input: string) { return addName("boolMethodCallExpr",choice((sequence((parserEndswithmethodcallexpr))),(sequence((parserStartswithmethodcallexpr))),(sequence((parserContainsmethodcallexpr))),(sequence((parserIntersectsmethodcallexpr))),(sequence((parserHassubsetmethodcallexpr))),(sequence((parserHassubsequencemethodcallexpr)))))(level, input); }
function parserBooleanvalue(level : number , input: string) { return addName("booleanValue",choice((sequence((parserAny("true")))),(sequence((parserAny("false"))))))(level, input); }
function parserBoundfunctionexpr(level : number , input: string) { return addName("boundFunctionExpr",sequence((parserFunctionexpr)))(level, input); }
function parserBytevalue(level : number , input: string) { return addName("byteValue",sequence((repetition(1,3,sequence((parserDigit))))))(level, input); }
function parserCastexpr(level : number , input: string) { return addName("castExpr",sequence((parserAny("cast")),(parserOpen),(parserBws),(optional(sequence((parserCommonexpr),(parserBws),(parserComma),(parserBws)))),(parserQualifiedtypename),(parserBws),(parserClose)))(level, input); }
function parserCeilingmethodcallexpr(level : number , input: string) { return addName("ceilingMethodCallExpr",sequence((parserAny("ceiling")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserCharinjson(level : number , input: string) { return addName("charInJSON",choice((sequence((parserQcharUnescaped))),(sequence((parserQcharJsonSpecial))),(sequence((parserEscape),(choice((sequence((parserQuotationMark))),(sequence((parserEscape))),(sequence((choice((sequence((parserAny("/")))),(sequence((parserAny("%2F")))))))),(sequence((parserAny("b")))),(sequence((parserAny("f")))),(sequence((parserAny("n")))),(sequence((parserAny("r")))),(sequence((parserAny("t")))),(sequence((parserAny("u")),(repetition(4,4,sequence((parserHexdig))))))))))))(level, input); }
function parserCollectionliteral(level : number , input: string) { return addName("collectionLiteral",sequence((parserAny("Collection(")),(parserGeoliteral),(repetition(0,0,sequence((sequence((parserComma),(parserGeoliteral))),(parserClose))))))(level, input); }
function parserCollectionnavpropinjson(level : number , input: string) { return addName("collectionNavPropInJSON",sequence((parserQuotationMark),(parserEntitycolnavigationproperty),(parserQuotationMark),(parserNameSeparator),(parserRootexprcol)))(level, input); }
function parserCollectionnavigationexpr(level : number , input: string) { return addName("collectionNavigationExpr",sequence((optional(sequence((parserAny("/")),(parserQualifiedentitytypename)))),(optional(choice((sequence((parserKeypredicate),(optional(sequence((parserSinglenavigationexpr)))))),(sequence((parserCollectionpathexpr))))))))(level, input); }
function parserCollectionpathexpr(level : number , input: string) { return addName("collectionPathExpr",choice((sequence((parserCount),(optional(sequence((parserOpen),(parserExpandcountoption),(repetition(0,0,sequence((sequence((parserSemi),(parserExpandcountoption))),(parserClose))))))))),(sequence((parserAny("/")),(parserBoundfunctionexpr))),(sequence((parserAny("/")),(parserAnnotationexpr))),(sequence((parserAny("/")),(parserAnyexpr))),(sequence((parserAny("/")),(parserAllexpr)))))(level, input); }
function parserCollectionpropertyinuri(level : number , input: string) { return addName("collectionPropertyInUri",choice((sequence((sequence((parserQuotationMark),(parserPrimitivecolproperty),(parserQuotationMark),(parserNameSeparator),(parserPrimitivecolinuri))))),(sequence((sequence((parserQuotationMark),(parserComplexcolproperty),(parserQuotationMark),(parserNameSeparator),(parserComplexcolinuri)))))))(level, input); }
function parserCommonexpr(level : number , input: string) { return addName("commonExpr",sequence((choice((sequence((parserPrimitiveliteral))),(sequence((parserArrayorobject))),(sequence((parserRootexpr))),(sequence((parserFirstmemberexpr))),(sequence((parserFunctionexpr))),(sequence((parserNegateexpr))),(sequence((parserMethodcallexpr))),(sequence((parserParenexpr))),(sequence((parserListexpr))),(sequence((parserCastexpr))),(sequence((parserIsofexpr))),(sequence((parserNotexpr))))),(optional(choice((sequence((parserAddexpr))),(sequence((parserSubexpr))),(sequence((parserMulexpr))),(sequence((parserDivexpr))),(sequence((parserDivbyexpr))),(sequence((parserModexpr)))))),(optional(choice((sequence((parserEqexpr))),(sequence((parserNeexpr))),(sequence((parserLtexpr))),(sequence((parserLeexpr))),(sequence((parserGtexpr))),(sequence((parserGeexpr))),(sequence((parserHasexpr))),(sequence((parserInexpr)))))),(optional(choice((sequence((parserAndexpr))),(sequence((parserOrexpr))))))))(level, input); }
function parserComplexcolfunction(level : number , input: string) { return addName("complexColFunction",sequence((parserOdataidentifier)))(level, input); }
function parserComplexcolinuri(level : number , input: string) { return addName("complexColInUri",sequence((parserBeginArray),(optional(sequence((parserComplexinuri),(repetition(0,0,sequence((sequence((parserValueSeparator),(parserComplexinuri))))))))),(parserEndArray)))(level, input); }
function parserComplexcolpathexpr(level : number , input: string) { return addName("complexColPathExpr",sequence((optional(sequence((parserAny("/")),(parserQualifiedcomplextypename)))),(optional(sequence((parserCollectionpathexpr))))))(level, input); }
function parserComplexcolproperty(level : number , input: string) { return addName("complexColProperty",sequence((parserOdataidentifier)))(level, input); }
function parserComplexfunction(level : number , input: string) { return addName("complexFunction",sequence((parserOdataidentifier)))(level, input); }
function parserComplexinuri(level : number , input: string) { return addName("complexInUri",sequence((parserBeginObject),(optional(sequence((choice((sequence((parserAnnotationinuri))),(sequence((parserPrimitivepropertyinuri))),(sequence((parserComplexpropertyinuri))),(sequence((parserCollectionpropertyinuri))),(sequence((parserNavigationpropertyinuri))))),(repetition(0,0,sequence((sequence((parserValueSeparator),(choice((sequence((parserAnnotationinuri))),(sequence((parserPrimitivepropertyinuri))),(sequence((parserComplexpropertyinuri))),(sequence((parserCollectionpropertyinuri))),(sequence((parserNavigationpropertyinuri))))))))))))),(parserEndObject)))(level, input); }
function parserComplexpathexpr(level : number , input: string) { return addName("complexPathExpr",sequence((optional(sequence((parserAny("/")),(parserQualifiedcomplextypename)))),(optional(choice((sequence((parserAny("/")),(parserPropertypathexpr))),(sequence((parserAny("/")),(parserBoundfunctionexpr))),(sequence((parserAny("/")),(parserAnnotationexpr))))))))(level, input); }
function parserComplexproperty(level : number , input: string) { return addName("complexProperty",sequence((parserOdataidentifier)))(level, input); }
function parserComplexpropertyinuri(level : number , input: string) { return addName("complexPropertyInUri",sequence((parserQuotationMark),(parserComplexproperty),(parserQuotationMark),(parserNameSeparator),(parserComplexinuri)))(level, input); }
function parserComplextypename(level : number , input: string) { return addName("complexTypeName",sequence((parserOdataidentifier)))(level, input); }
function parserCompoundkey(level : number , input: string) { return addName("compoundKey",sequence((parserOpen),(parserKeyvaluepair),(repetition(0,0,sequence((sequence((parserComma),(parserKeyvaluepair))),(parserClose))))))(level, input); }
function parserConcatmethodcallexpr(level : number , input: string) { return addName("concatMethodCallExpr",sequence((parserAny("concat")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserConcretespatialtypename(level : number , input: string) { return addName("concreteSpatialTypeName",choice((sequence((parserAny("Collection")))),(sequence((parserAny("LineString")))),(sequence((parserAny("MultiLineString")))),(sequence((parserAny("MultiPoint")))),(sequence((parserAny("MultiPolygon")))),(sequence((parserAny("Point")))),(sequence((parserAny("Polygon"))))))(level, input); }
function parserContainsmethodcallexpr(level : number , input: string) { return addName("containsMethodCallExpr",sequence((parserAny("contains")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserCount(level : number , input: string) { return addName("count",sequence((parserAny("/$count"))))(level, input); }
function parserDatemethodcallexpr(level : number , input: string) { return addName("dateMethodCallExpr",sequence((parserAny("date")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserDatetimeoffsetvalue(level : number , input: string) { return addName("dateTimeOffsetValue",sequence((parserYear),(parserAny("-")),(parserMonth),(parserAny("-")),(parserDay),(parserAny("T")),(parserHour),(parserAny(":")),(parserMinute),(optional(sequence((parserAny(":")),(parserSecond),(optional(sequence((parserAny(".")),(parserFractionalseconds))))))),(choice((sequence((parserAny("Z")))),(sequence((parserSign),(parserHour),(parserAny(":")),(parserMinute)))))))(level, input); }
function parserDatevalue(level : number , input: string) { return addName("dateValue",sequence((parserYear),(parserAny("-")),(parserMonth),(parserAny("-")),(parserDay)))(level, input); }
function parserDay(level : number , input: string) { return addName("day",choice((sequence((parserAny("0")),(parserOnetonine))),(sequence((choice((sequence((parserAny("1")))),(sequence((parserAny("2")))))),(parserDigit))),(sequence((parserAny("3")),(choice((sequence((parserAny("0")))),(sequence((parserAny("1"))))))))))(level, input); }
function parserDaymethodcallexpr(level : number , input: string) { return addName("dayMethodCallExpr",sequence((parserAny("day")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserDecimalvalue(level : number , input: string) { return addName("decimalValue",sequence((optional(sequence((parserSign)))),(repetition(1,0,choice((sequence((parserDigit),(optional(sequence((parserAny(".")),(repetition(1,0,sequence((parserDigit))))))),(optional(sequence((parserAny("e")),(optional(sequence((parserSign)))),(repetition(1,0,sequence((parserDigit))))))))),(sequence((parserNaninfinity))))))))(level, input); }
function parserDistancemethodcallexpr(level : number , input: string) { return addName("distanceMethodCallExpr",sequence((parserAny("geo.distance")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserDivexpr(level : number , input: string) { return addName("divExpr",sequence((parserRws),(parserAny("div")),(parserRws),(parserCommonexpr)))(level, input); }
function parserDivbyexpr(level : number , input: string) { return addName("divbyExpr",sequence((parserRws),(parserAny("divby")),(parserRws),(parserCommonexpr)))(level, input); }
function parserDoublevalue(level : number , input: string) { return addName("doubleValue",sequence((parserDecimalvalue)))(level, input); }
function parserDuration(level : number , input: string) { return addName("duration",sequence((optional(sequence((parserAny("duration"))))),(parserSquote),(parserDurationvalue),(parserSquote)))(level, input); }
function parserDurationvalue(level : number , input: string) { return addName("durationValue",sequence((optional(sequence((parserSign)))),(parserAny("P")),(optional(sequence((repetition(1,0,sequence((parserDigit),(parserAny("D")))))))),(optional(sequence((parserAny("T")),(optional(sequence((repetition(1,0,sequence((parserDigit),(parserAny("H")))))))),(optional(sequence((repetition(1,0,sequence((parserDigit),(parserAny("M")))))))),(optional(sequence((repetition(1,0,sequence((parserDigit),(optional(sequence((parserAny(".")),(repetition(1,0,sequence((parserDigit))))))),(parserAny("S")))))))))))))(level, input); }
function parserEndArray(level : number , input: string) { return addName("end-array",sequence((parserBws),(choice((sequence((parserAny("]")))),(sequence((parserAny("%5D"))))))))(level, input); }
function parserEndObject(level : number , input: string) { return addName("end-object",sequence((parserBws),(choice((sequence((parserAny("}")))),(sequence((parserAny("%7D"))))))))(level, input); }
function parserEndswithmethodcallexpr(level : number , input: string) { return addName("endsWithMethodCallExpr",sequence((parserAny("endswith")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserEntitycolfunction(level : number , input: string) { return addName("entityColFunction",sequence((parserOdataidentifier)))(level, input); }
function parserEntitycolnavigationproperty(level : number , input: string) { return addName("entityColNavigationProperty",sequence((parserOdataidentifier)))(level, input); }
function parserEntityfunction(level : number , input: string) { return addName("entityFunction",sequence((parserOdataidentifier)))(level, input); }
function parserEntitynavigationproperty(level : number , input: string) { return addName("entityNavigationProperty",sequence((parserOdataidentifier)))(level, input); }
function parserEntitysetname(level : number , input: string) { return addName("entitySetName",sequence((parserOdataidentifier)))(level, input); }
function parserEntitytypename(level : number , input: string) { return addName("entityTypeName",sequence((parserOdataidentifier)))(level, input); }
function parserEnum(level : number , input: string) { return addName("enum",sequence((optional(sequence((parserQualifiedenumtypename)))),(parserSquote),(parserEnumvalue),(parserSquote)))(level, input); }
function parserEnummembervalue(level : number , input: string) { return addName("enumMemberValue",sequence((parserInt64value)))(level, input); }
function parserEnumvalue(level : number , input: string) { return addName("enumValue",sequence((parserSingleenumvalue),(repetition(0,0,sequence((sequence((parserComma),(parserSingleenumvalue))))))))(level, input); }
function parserEnumerationmember(level : number , input: string) { return addName("enumerationMember",sequence((parserOdataidentifier)))(level, input); }
function parserEnumerationtypename(level : number , input: string) { return addName("enumerationTypeName",sequence((parserOdataidentifier)))(level, input); }
function parserEqexpr(level : number , input: string) { return addName("eqExpr",sequence((parserRws),(parserAny("eq")),(parserRws),(parserCommonexpr)))(level, input); }
function parserEscape(level : number , input: string) { return addName("escape",choice((sequence((parserAny("\\")))),(sequence((parserAny("%5C"))))))(level, input); }
function parserExp(level : number , input: string) { return addName("exp",sequence((parserAny("e")),(optional(choice((sequence((parserAny("-")))),(sequence((parserAny("+"))))))),(repetition(1,0,sequence((parserDigit))))))(level, input); }
function parserExpandcountoption(level : number , input: string) { return addName("expandCountOption",choice((sequence((parserFilter))),(sequence((parserSearch)))))(level, input); }
function parserFilter(level : number , input: string) { return addName("filter",sequence((choice((sequence((parserAny("$filter")))),(sequence((parserAny("filter")))))),(parserEq),(parserBoolcommonexpr)))(level, input); }
function parserFirstmemberexpr(level : number , input: string) { return addName("firstMemberExpr",choice((sequence((parserMemberexpr))),(sequence((parserInscopevariableexpr),(optional(sequence((parserAny("/")),(parserMemberexpr))))))))(level, input); }
function parserFloormethodcallexpr(level : number , input: string) { return addName("floorMethodCallExpr",sequence((parserAny("floor")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserFrac(level : number , input: string) { return addName("frac",sequence((parserAny(".")),(repetition(1,0,sequence((parserDigit))))))(level, input); }
function parserFractionalseconds(level : number , input: string) { return addName("fractionalSeconds",sequence((repetition(1,12,sequence((parserDigit))))))(level, input); }
function parserFractionalsecondsmethodcallexpr(level : number , input: string) { return addName("fractionalsecondsMethodCallExpr",sequence((parserAny("fractionalseconds")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserFullcollectionliteral(level : number , input: string) { return addName("fullCollectionLiteral",sequence((parserSridliteral),(parserCollectionliteral)))(level, input); }
function parserFulllinestringliteral(level : number , input: string) { return addName("fullLineStringLiteral",sequence((parserSridliteral),(parserLinestringliteral)))(level, input); }
function parserFullmultilinestringliteral(level : number , input: string) { return addName("fullMultiLineStringLiteral",sequence((parserSridliteral),(parserMultilinestringliteral)))(level, input); }
function parserFullmultipointliteral(level : number , input: string) { return addName("fullMultiPointLiteral",sequence((parserSridliteral),(parserMultipointliteral)))(level, input); }
function parserFullmultipolygonliteral(level : number , input: string) { return addName("fullMultiPolygonLiteral",sequence((parserSridliteral),(parserMultipolygonliteral)))(level, input); }
function parserFullpointliteral(level : number , input: string) { return addName("fullPointLiteral",sequence((parserSridliteral),(parserPointliteral)))(level, input); }
function parserFullpolygonliteral(level : number , input: string) { return addName("fullPolygonLiteral",sequence((parserSridliteral),(parserPolygonliteral)))(level, input); }
function parserFunctionexpr(level : number , input: string) { return addName("functionExpr",sequence((parserNamespace),(parserAny(".")),(choice((sequence((parserEntitycolfunction),(parserFunctionexprparameters),(optional(sequence((parserCollectionnavigationexpr)))))),(sequence((parserEntityfunction),(parserFunctionexprparameters),(optional(sequence((parserSinglenavigationexpr)))))),(sequence((parserComplexcolfunction),(parserFunctionexprparameters),(optional(sequence((parserComplexcolpathexpr)))))),(sequence((parserComplexfunction),(parserFunctionexprparameters),(optional(sequence((parserComplexpathexpr)))))),(sequence((parserPrimitivecolfunction),(parserFunctionexprparameters),(optional(sequence((parserCollectionpathexpr)))))),(sequence((parserPrimitivefunction),(parserFunctionexprparameters),(optional(sequence((parserPrimitivepathexpr))))))))))(level, input); }
function parserFunctionexprparameter(level : number , input: string) { return addName("functionExprParameter",sequence((parserParametername),(parserEq),(choice((sequence((parserParameteralias))),(sequence((parserParametervalue)))))))(level, input); }
function parserFunctionexprparameters(level : number , input: string) { return addName("functionExprParameters",sequence((parserOpen),(optional(sequence((parserFunctionexprparameter),(repetition(0,0,sequence((sequence((parserComma),(parserFunctionexprparameter))))))))),(parserClose)))(level, input); }
function parserGeexpr(level : number , input: string) { return addName("geExpr",sequence((parserRws),(parserAny("ge")),(parserRws),(parserCommonexpr)))(level, input); }
function parserGeolengthmethodcallexpr(level : number , input: string) { return addName("geoLengthMethodCallExpr",sequence((parserAny("geo.length")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserGeoliteral(level : number , input: string) { return addName("geoLiteral",choice((sequence((parserCollectionliteral))),(sequence((parserLinestringliteral))),(sequence((parserMultipointliteral))),(sequence((parserMultilinestringliteral))),(sequence((parserMultipolygonliteral))),(sequence((parserPointliteral))),(sequence((parserPolygonliteral)))))(level, input); }
function parserGeographycollection(level : number , input: string) { return addName("geographyCollection",sequence((parserGeographyprefix),(parserSquote),(parserFullcollectionliteral),(parserSquote)))(level, input); }
function parserGeographylinestring(level : number , input: string) { return addName("geographyLineString",sequence((parserGeographyprefix),(parserSquote),(parserFulllinestringliteral),(parserSquote)))(level, input); }
function parserGeographymultilinestring(level : number , input: string) { return addName("geographyMultiLineString",sequence((parserGeographyprefix),(parserSquote),(parserFullmultilinestringliteral),(parserSquote)))(level, input); }
function parserGeographymultipoint(level : number , input: string) { return addName("geographyMultiPoint",sequence((parserGeographyprefix),(parserSquote),(parserFullmultipointliteral),(parserSquote)))(level, input); }
function parserGeographymultipolygon(level : number , input: string) { return addName("geographyMultiPolygon",sequence((parserGeographyprefix),(parserSquote),(parserFullmultipolygonliteral),(parserSquote)))(level, input); }
function parserGeographypoint(level : number , input: string) { return addName("geographyPoint",sequence((parserGeographyprefix),(parserSquote),(parserFullpointliteral),(parserSquote)))(level, input); }
function parserGeographypolygon(level : number , input: string) { return addName("geographyPolygon",sequence((parserGeographyprefix),(parserSquote),(parserFullpolygonliteral),(parserSquote)))(level, input); }
function parserGeographyprefix(level : number , input: string) { return addName("geographyPrefix",sequence((parserAny("geography"))))(level, input); }
function parserGeometrycollection(level : number , input: string) { return addName("geometryCollection",sequence((parserGeometryprefix),(parserSquote),(parserFullcollectionliteral),(parserSquote)))(level, input); }
function parserGeometrylinestring(level : number , input: string) { return addName("geometryLineString",sequence((parserGeometryprefix),(parserSquote),(parserFulllinestringliteral),(parserSquote)))(level, input); }
function parserGeometrymultilinestring(level : number , input: string) { return addName("geometryMultiLineString",sequence((parserGeometryprefix),(parserSquote),(parserFullmultilinestringliteral),(parserSquote)))(level, input); }
function parserGeometrymultipoint(level : number , input: string) { return addName("geometryMultiPoint",sequence((parserGeometryprefix),(parserSquote),(parserFullmultipointliteral),(parserSquote)))(level, input); }
function parserGeometrymultipolygon(level : number , input: string) { return addName("geometryMultiPolygon",sequence((parserGeometryprefix),(parserSquote),(parserFullmultipolygonliteral),(parserSquote)))(level, input); }
function parserGeometrypoint(level : number , input: string) { return addName("geometryPoint",sequence((parserGeometryprefix),(parserSquote),(parserFullpointliteral),(parserSquote)))(level, input); }
function parserGeometrypolygon(level : number , input: string) { return addName("geometryPolygon",sequence((parserGeometryprefix),(parserSquote),(parserFullpolygonliteral),(parserSquote)))(level, input); }
function parserGeometryprefix(level : number , input: string) { return addName("geometryPrefix",sequence((parserAny("geometry"))))(level, input); }
function parserGtexpr(level : number , input: string) { return addName("gtExpr",sequence((parserRws),(parserAny("gt")),(parserRws),(parserCommonexpr)))(level, input); }
function parserGuidvalue(level : number , input: string) { return addName("guidValue",sequence((repetition(8,8,sequence((parserHexdig),(parserAny("-")),(repetition(4,4,sequence((parserHexdig),(parserAny("-")),(repetition(4,4,sequence((parserHexdig),(parserAny("-")),(repetition(4,4,sequence((parserHexdig),(parserAny("-")),(repetition(1,1,sequence((repetition(2,2,sequence((parserHexdig)))))))))))))))))))))(level, input); }
function parserHasexpr(level : number , input: string) { return addName("hasExpr",sequence((parserRws),(parserAny("has")),(parserRws),(parserEnum)))(level, input); }
function parserHassubsequencemethodcallexpr(level : number , input: string) { return addName("hasSubsequenceMethodCallExpr",sequence((parserAny("hassubsequence")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserHassubsetmethodcallexpr(level : number , input: string) { return addName("hasSubsetMethodCallExpr",sequence((parserAny("hassubset")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserHour(level : number , input: string) { return addName("hour",choice((sequence((choice((sequence((parserAny("0")))),(sequence((parserAny("1")))))),(parserDigit))),(sequence((parserAny("2")),(choice((sequence((parserAny("0")))),(sequence((parserAny("1")))),(sequence((parserAny("2")))),(sequence((parserAny("3"))))))))))(level, input); }
function parserHourmethodcallexpr(level : number , input: string) { return addName("hourMethodCallExpr",sequence((parserAny("hour")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserIdentifiercharacter(level : number , input: string) { return addName("identifierCharacter",choice((sequence((parserAlpha))),(sequence((parserAny("_")))),(sequence((parserDigit)))))(level, input); }
function parserIdentifierleadingcharacter(level : number , input: string) { return addName("identifierLeadingCharacter",choice((sequence((parserAlpha))),(sequence((parserAny("_"))))))(level, input); }
function parserImplicitvariableexpr(level : number , input: string) { return addName("implicitVariableExpr",choice((sequence((parserAny("$it")))),(sequence((parserAny("$this"))))))(level, input); }
function parserInexpr(level : number , input: string) { return addName("inExpr",sequence((parserRws),(parserAny("in")),(parserRws),(parserCommonexpr)))(level, input); }
function parserIndexofmethodcallexpr(level : number , input: string) { return addName("indexOfMethodCallExpr",sequence((parserAny("indexof")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserInscopevariableexpr(level : number , input: string) { return addName("inscopeVariableExpr",choice((sequence((parserImplicitvariableexpr))),(sequence((parserParameteralias))),(sequence((parserLambdavariableexpr)))))(level, input); }
function parserInt(level : number , input: string) { return addName("int",choice((sequence((parserAny("0")))),(sequence((sequence((parserOnetonine),(repetition(0,0,sequence((parserDigit))))))))))(level, input); }
function parserInt16value(level : number , input: string) { return addName("int16Value",sequence((optional(sequence((parserSign)))),(repetition(1,5,sequence((parserDigit))))))(level, input); }
function parserInt32value(level : number , input: string) { return addName("int32Value",sequence((optional(sequence((parserSign)))),(repetition(1,10,sequence((parserDigit))))))(level, input); }
function parserInt64value(level : number , input: string) { return addName("int64Value",sequence((optional(sequence((parserSign)))),(repetition(1,19,sequence((parserDigit))))))(level, input); }
function parserIntersectsmethodcallexpr(level : number , input: string) { return addName("intersectsMethodCallExpr",sequence((parserAny("geo.intersects")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserIsofexpr(level : number , input: string) { return addName("isofExpr",sequence((parserAny("isof")),(parserOpen),(parserBws),(optional(sequence((parserCommonexpr),(parserBws),(parserComma),(parserBws)))),(parserQualifiedtypename),(parserBws),(parserClose)))(level, input); }
function parserKeypathliteral(level : number , input: string) { return addName("keyPathLiteral",sequence((repetition(0,0,sequence((parserPchar))))))(level, input); }
function parserKeypathsegments(level : number , input: string) { return addName("keyPathSegments",sequence((repetition(1,0,sequence((sequence((parserAny("/")),(parserKeypathliteral))))))))(level, input); }
function parserKeypredicate(level : number , input: string) { return addName("keyPredicate",choice((sequence((parserSimplekey))),(sequence((parserCompoundkey))),(sequence((parserKeypathsegments)))))(level, input); }
function parserKeypropertyalias(level : number , input: string) { return addName("keyPropertyAlias",sequence((parserOdataidentifier)))(level, input); }
function parserKeypropertyvalue(level : number , input: string) { return addName("keyPropertyValue",sequence((parserPrimitiveliteral)))(level, input); }
function parserKeyvaluepair(level : number , input: string) { return addName("keyValuePair",sequence((choice((sequence((parserPrimitivekeyproperty))),(sequence((parserKeypropertyalias))))),(parserEq),(choice((sequence((parserParameteralias))),(sequence((parserKeypropertyvalue)))))))(level, input); }
function parserLambdapredicateexpr(level : number , input: string) { return addName("lambdaPredicateExpr",sequence((parserBoolcommonexpr)))(level, input); }
function parserLambdavariableexpr(level : number , input: string) { return addName("lambdaVariableExpr",sequence((parserOdataidentifier)))(level, input); }
function parserLeexpr(level : number , input: string) { return addName("leExpr",sequence((parserRws),(parserAny("le")),(parserRws),(parserCommonexpr)))(level, input); }
function parserLengthmethodcallexpr(level : number , input: string) { return addName("lengthMethodCallExpr",sequence((parserAny("length")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserLinestringdata(level : number , input: string) { return addName("lineStringData",sequence((parserOpen),(parserPositionliteral),(repetition(1,0,sequence((sequence((parserComma),(parserPositionliteral))),(parserClose))))))(level, input); }
function parserLinestringliteral(level : number , input: string) { return addName("lineStringLiteral",sequence((parserAny("LineString")),(parserLinestringdata)))(level, input); }
function parserListexpr(level : number , input: string) { return addName("listExpr",sequence((parserOpen),(parserBws),(parserCommonexpr),(parserBws),(repetition(0,0,sequence((sequence((parserComma),(parserBws),(parserCommonexpr),(parserBws))),(parserClose))))))(level, input); }
function parserLtexpr(level : number , input: string) { return addName("ltExpr",sequence((parserRws),(parserAny("lt")),(parserRws),(parserCommonexpr)))(level, input); }
function parserMaxdatetimemethodcallexpr(level : number , input: string) { return addName("maxDateTimeMethodCallExpr",sequence((parserAny("maxdatetime")),(parserOpen),(parserBws),(parserClose)))(level, input); }
function parserMemberexpr(level : number , input: string) { return addName("memberExpr",sequence((optional(sequence((parserQualifiedentitytypename),(parserAny("/"))))),(choice((sequence((parserPropertypathexpr))),(sequence((parserBoundfunctionexpr))),(sequence((parserAnnotationexpr)))))))(level, input); }
function parserMethodcallexpr(level : number , input: string) { return addName("methodCallExpr",choice((sequence((parserIndexofmethodcallexpr))),(sequence((parserTolowermethodcallexpr))),(sequence((parserTouppermethodcallexpr))),(sequence((parserTrimmethodcallexpr))),(sequence((parserSubstringmethodcallexpr))),(sequence((parserConcatmethodcallexpr))),(sequence((parserLengthmethodcallexpr))),(sequence((parserYearmethodcallexpr))),(sequence((parserMonthmethodcallexpr))),(sequence((parserDaymethodcallexpr))),(sequence((parserHourmethodcallexpr))),(sequence((parserMinutemethodcallexpr))),(sequence((parserSecondmethodcallexpr))),(sequence((parserFractionalsecondsmethodcallexpr))),(sequence((parserTotalsecondsmethodcallexpr))),(sequence((parserDatemethodcallexpr))),(sequence((parserTimemethodcallexpr))),(sequence((parserRoundmethodcallexpr))),(sequence((parserFloormethodcallexpr))),(sequence((parserCeilingmethodcallexpr))),(sequence((parserDistancemethodcallexpr))),(sequence((parserGeolengthmethodcallexpr))),(sequence((parserTotaloffsetminutesmethodcallexpr))),(sequence((parserMindatetimemethodcallexpr))),(sequence((parserMaxdatetimemethodcallexpr))),(sequence((parserNowmethodcallexpr))),(sequence((parserBoolmethodcallexpr)))))(level, input); }
function parserMindatetimemethodcallexpr(level : number , input: string) { return addName("minDateTimeMethodCallExpr",sequence((parserAny("mindatetime")),(parserOpen),(parserBws),(parserClose)))(level, input); }
function parserMinute(level : number , input: string) { return addName("minute",sequence((parserZerotofiftynine)))(level, input); }
function parserMinutemethodcallexpr(level : number , input: string) { return addName("minuteMethodCallExpr",sequence((parserAny("minute")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserModexpr(level : number , input: string) { return addName("modExpr",sequence((parserRws),(parserAny("mod")),(parserRws),(parserCommonexpr)))(level, input); }
function parserMonth(level : number , input: string) { return addName("month",choice((sequence((parserAny("0")),(parserOnetonine))),(sequence((parserAny("1")),(choice((sequence((parserAny("0")))),(sequence((parserAny("1")))),(sequence((parserAny("2"))))))))))(level, input); }
function parserMonthmethodcallexpr(level : number , input: string) { return addName("monthMethodCallExpr",sequence((parserAny("month")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserMulexpr(level : number , input: string) { return addName("mulExpr",sequence((parserRws),(parserAny("mul")),(parserRws),(parserCommonexpr)))(level, input); }
function parserMultilinestringliteral(level : number , input: string) { return addName("multiLineStringLiteral",sequence((parserAny("MultiLineString(")),(optional(sequence((parserLinestringdata),(repetition(0,0,sequence((sequence((parserComma),(parserLinestringdata))))))))),(parserClose)))(level, input); }
function parserMultipointliteral(level : number , input: string) { return addName("multiPointLiteral",sequence((parserAny("MultiPoint(")),(optional(sequence((parserPointdata),(repetition(0,0,sequence((sequence((parserComma),(parserPointdata))))))))),(parserClose)))(level, input); }
function parserMultipolygonliteral(level : number , input: string) { return addName("multiPolygonLiteral",sequence((parserAny("MultiPolygon(")),(optional(sequence((parserPolygondata),(repetition(0,0,sequence((sequence((parserComma),(parserPolygondata))))))))),(parserClose)))(level, input); }
function parserNameSeparator(level : number , input: string) { return addName("name-separator",sequence((parserBws),(parserColon),(parserBws)))(level, input); }
function parserNamespace(level : number , input: string) { return addName("namespace",sequence((parserNamespacepart),(repetition(0,0,sequence((sequence((parserAny(".")),(parserNamespacepart))))))))(level, input); }
function parserNamespacepart(level : number , input: string) { return addName("namespacePart",sequence((parserOdataidentifier)))(level, input); }
function parserNaninfinity(level : number , input: string) { return addName("nanInfinity",choice((sequence((parserAny("NaN")))),(sequence((parserAny("-INF")))),(sequence((parserAny("INF"))))))(level, input); }
function parserNavigationpropertyinuri(level : number , input: string) { return addName("navigationPropertyInUri",choice((sequence((parserSinglenavpropinjson))),(sequence((parserCollectionnavpropinjson)))))(level, input); }
function parserNeexpr(level : number , input: string) { return addName("neExpr",sequence((parserRws),(parserAny("ne")),(parserRws),(parserCommonexpr)))(level, input); }
function parserNegateexpr(level : number , input: string) { return addName("negateExpr",sequence((parserAny("-")),(parserBws),(parserCommonexpr)))(level, input); }
function parserNotexpr(level : number , input: string) { return addName("notExpr",sequence((parserAny("not")),(parserRws),(parserBoolcommonexpr)))(level, input); }
function parserNowmethodcallexpr(level : number , input: string) { return addName("nowMethodCallExpr",sequence((parserAny("now")),(parserOpen),(parserBws),(parserClose)))(level, input); }
function parserNullvalue(level : number , input: string) { return addName("nullValue",sequence((parserAny("null"))))(level, input); }
function parserNumberinjson(level : number , input: string) { return addName("numberInJSON",sequence((optional(sequence((parserAny("-"))))),(parserInt),(optional(sequence((parserFrac)))),(optional(sequence((parserExp))))))(level, input); }
function parserOdataidentifier(level : number , input: string) { return addName("odataIdentifier",sequence((parserIdentifierleadingcharacter),(repetition(0,127,sequence((parserIdentifiercharacter))))))(level, input); }
function parserOnetonine(level : number , input: string) { return addName("oneToNine",choice((sequence((parserAny("1")))),(sequence((parserAny("2")))),(sequence((parserAny("3")))),(sequence((parserAny("4")))),(sequence((parserAny("5")))),(sequence((parserAny("6")))),(sequence((parserAny("7")))),(sequence((parserAny("8")))),(sequence((parserAny("9"))))))(level, input); }
function parserOrexpr(level : number , input: string) { return addName("orExpr",sequence((parserRws),(parserAny("or")),(parserRws),(parserBoolcommonexpr)))(level, input); }
function parserOtherDelims(level : number , input: string) { return addName("other-delims",choice((sequence((parserAny("!")))),(sequence((parserAny("(")))),(sequence((parserAny(")")))),(sequence((parserAny("*")))),(sequence((parserAny("+")))),(sequence((parserAny(",")))),(sequence((parserAny(";"))))))(level, input); }
function parserParameteralias(level : number , input: string) { return addName("parameterAlias",sequence((parserAt),(parserOdataidentifier)))(level, input); }
function parserParametername(level : number , input: string) { return addName("parameterName",sequence((parserOdataidentifier)))(level, input); }
function parserParametervalue(level : number , input: string) { return addName("parameterValue",choice((sequence((parserArrayorobject))),(sequence((parserCommonexpr)))))(level, input); }
function parserParenexpr(level : number , input: string) { return addName("parenExpr",sequence((parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserPchar(level : number , input: string) { return addName("pchar",choice((sequence((parserUnreserved))),(sequence((parserPctEncoded))),(sequence((parserSubDelims))),(sequence((parserAny(":")))),(sequence((parserAny("@"))))))(level, input); }
function parserPcharNoSquote(level : number , input: string) { return addName("pchar-no-SQUOTE",choice((sequence((parserUnreserved))),(sequence((parserPctEncodedNoSquote))),(sequence((parserOtherDelims))),(sequence((parserAny("$")))),(sequence((parserAny("&")))),(sequence((parserAny("=")))),(sequence((parserAny(":")))),(sequence((parserAny("@"))))))(level, input); }
function parserPctEncoded(level : number , input: string) { return addName("pct-encoded",sequence((parserAny("%")),(parserHexdig),(parserHexdig)))(level, input); }
function parserPctEncodedNoSquote(level : number , input: string) { return addName("pct-encoded-no-SQUOTE",choice((sequence((parserAny("%")),(choice((sequence((parserAny("0")))),(sequence((parserAny("1")))),(sequence((parserAny("3")))),(sequence((parserAny("4")))),(sequence((parserAny("5")))),(sequence((parserAny("6")))),(sequence((parserAny("8")))),(sequence((parserAny("9")))),(sequence((parserAToF))))),(parserHexdig))),(sequence((parserAny("%")),(parserAny("2")),(choice((sequence((parserAny("0")))),(sequence((parserAny("1")))),(sequence((parserAny("2")))),(sequence((parserAny("3")))),(sequence((parserAny("4")))),(sequence((parserAny("5")))),(sequence((parserAny("6")))),(sequence((parserAny("8")))),(sequence((parserAny("9")))),(sequence((parserAToF)))))))))(level, input); }
function parserPctEncodedUnescaped(level : number , input: string) { return addName("pct-encoded-unescaped",choice((sequence((parserAny("%")),(choice((sequence((parserAny("0")))),(sequence((parserAny("1")))),(sequence((parserAny("3")))),(sequence((parserAny("4")))),(sequence((parserAny("6")))),(sequence((parserAny("7")))),(sequence((parserAny("8")))),(sequence((parserAny("9")))),(sequence((parserAToF))))),(parserHexdig))),(sequence((parserAny("%")),(parserAny("2")),(choice((sequence((parserAny("0")))),(sequence((parserAny("1")))),(sequence((parserAny("3")))),(sequence((parserAny("4")))),(sequence((parserAny("5")))),(sequence((parserAny("6")))),(sequence((parserAny("7")))),(sequence((parserAny("8")))),(sequence((parserAny("9")))),(sequence((parserAToF))))))),(sequence((parserAny("%")),(parserAny("5")),(choice((sequence((parserDigit))),(sequence((parserAny("A")))),(sequence((parserAny("B")))),(sequence((parserAny("D")))),(sequence((parserAny("E")))),(sequence((parserAny("F"))))))))))(level, input); }
function parserPointdata(level : number , input: string) { return addName("pointData",sequence((parserOpen),(parserPositionliteral),(parserClose)))(level, input); }
function parserPointliteral(level : number , input: string) { return addName("pointLiteral",sequence((parserAny("Point")),(parserPointdata)))(level, input); }
function parserPolygondata(level : number , input: string) { return addName("polygonData",sequence((parserOpen),(parserRingliteral),(repetition(0,0,sequence((sequence((parserComma),(parserRingliteral))),(parserClose))))))(level, input); }
function parserPolygonliteral(level : number , input: string) { return addName("polygonLiteral",sequence((parserAny("Polygon")),(parserPolygondata)))(level, input); }
function parserPositionliteral(level : number , input: string) { return addName("positionLiteral",sequence((parserDoublevalue),(parserSp),(parserDoublevalue)))(level, input); }
function parserPrimitivecolfunction(level : number , input: string) { return addName("primitiveColFunction",sequence((parserOdataidentifier)))(level, input); }
function parserPrimitivecolinuri(level : number , input: string) { return addName("primitiveColInUri",sequence((parserBeginArray),(optional(sequence((parserPrimitiveliteralinjson),(repetition(0,0,sequence((sequence((parserValueSeparator),(parserPrimitiveliteralinjson))))))))),(parserEndArray)))(level, input); }
function parserPrimitivecolproperty(level : number , input: string) { return addName("primitiveColProperty",sequence((parserOdataidentifier)))(level, input); }
function parserPrimitivefunction(level : number , input: string) { return addName("primitiveFunction",sequence((parserOdataidentifier)))(level, input); }
function parserPrimitivekeyproperty(level : number , input: string) { return addName("primitiveKeyProperty",sequence((parserOdataidentifier)))(level, input); }
function parserPrimitiveliteral(level : number , input: string) { return addName("primitiveLiteral",choice((sequence((parserNullvalue))),(sequence((parserBooleanvalue))),(sequence((parserGuidvalue))),(sequence((parserDatevalue))),(sequence((parserDatetimeoffsetvalue))),(sequence((parserTimeofdayvalue))),(sequence((parserDecimalvalue))),(sequence((parserDoublevalue))),(sequence((parserSinglevalue))),(sequence((parserSbytevalue))),(sequence((parserBytevalue))),(sequence((parserInt16value))),(sequence((parserInt32value))),(sequence((parserInt64value))),(sequence((parserString))),(sequence((parserDuration))),(sequence((parserEnum))),(sequence((parserBinary))),(sequence((parserGeographycollection))),(sequence((parserGeographylinestring))),(sequence((parserGeographymultilinestring))),(sequence((parserGeographymultipoint))),(sequence((parserGeographymultipolygon))),(sequence((parserGeographypoint))),(sequence((parserGeographypolygon))),(sequence((parserGeometrycollection))),(sequence((parserGeometrylinestring))),(sequence((parserGeometrymultilinestring))),(sequence((parserGeometrymultipoint))),(sequence((parserGeometrymultipolygon))),(sequence((parserGeometrypoint))),(sequence((parserGeometrypolygon)))))(level, input); }
function parserPrimitiveliteralinjson(level : number , input: string) { return addName("primitiveLiteralInJSON",choice((sequence((parserStringinjson))),(sequence((parserNumberinjson))),(sequence((parserAny("true")))),(sequence((parserAny("false")))),(sequence((parserAny("null"))))))(level, input); }
function parserPrimitivenonkeyproperty(level : number , input: string) { return addName("primitiveNonKeyProperty",sequence((parserOdataidentifier)))(level, input); }
function parserPrimitivepathexpr(level : number , input: string) { return addName("primitivePathExpr",sequence((parserAny("/")),(optional(choice((sequence((parserAnnotationexpr))),(sequence((parserBoundfunctionexpr))))))))(level, input); }
function parserPrimitiveproperty(level : number , input: string) { return addName("primitiveProperty",choice((sequence((parserPrimitivekeyproperty))),(sequence((parserPrimitivenonkeyproperty)))))(level, input); }
function parserPrimitivepropertyinuri(level : number , input: string) { return addName("primitivePropertyInUri",sequence((parserQuotationMark),(parserPrimitiveproperty),(parserQuotationMark),(parserNameSeparator),(parserPrimitiveliteralinjson)))(level, input); }
function parserPrimitivetypename(level : number , input: string) { return addName("primitiveTypeName",sequence((parserAny("Edm.")),(choice((sequence((parserAny("Binary")))),(sequence((parserAny("Boolean")))),(sequence((parserAny("Byte")))),(sequence((parserAny("Date")))),(sequence((parserAny("DateTimeOffset")))),(sequence((parserAny("Decimal")))),(sequence((parserAny("Double")))),(sequence((parserAny("Duration")))),(sequence((parserAny("Guid")))),(sequence((parserAny("Int16")))),(sequence((parserAny("Int32")))),(sequence((parserAny("Int64")))),(sequence((parserAny("SByte")))),(sequence((parserAny("Single")))),(sequence((parserAny("Stream")))),(sequence((parserAny("String")))),(sequence((parserAny("TimeOfDay")))),(sequence((parserAbstractspatialtypename),(optional(sequence((parserConcretespatialtypename))))))))))(level, input); }
function parserPropertypathexpr(level : number , input: string) { return addName("propertyPathExpr",sequence((choice((sequence((parserEntitycolnavigationproperty),(optional(sequence((parserCollectionnavigationexpr)))))),(sequence((parserEntitynavigationproperty),(optional(sequence((parserSinglenavigationexpr)))))),(sequence((parserComplexcolproperty),(optional(sequence((parserComplexcolpathexpr)))))),(sequence((parserComplexproperty),(optional(sequence((parserComplexpathexpr)))))),(sequence((parserPrimitivecolproperty),(optional(sequence((parserCollectionpathexpr)))))),(sequence((parserPrimitiveproperty),(optional(sequence((parserPrimitivepathexpr)))))),(sequence((parserStreamproperty),(optional(sequence((parserPrimitivepathexpr))))))))))(level, input); }
function parserQcharJsonSpecial(level : number , input: string) { return addName("qchar-JSON-special",choice((sequence((parserSp))),(sequence((parserAny(":")))),(sequence((parserAny("{")))),(sequence((parserAny("}")))),(sequence((parserAny("[")))),(sequence((parserAny("]"))))))(level, input); }
function parserQcharNoAmpDquote(level : number , input: string) { return addName("qchar-no-AMP-DQUOTE",choice((sequence((parserQcharUnescaped))),(sequence((parserEscape),(choice((sequence((parserEscape))),(sequence((parserQuotationMark)))))))))(level, input); }
function parserQcharUnescaped(level : number , input: string) { return addName("qchar-unescaped",choice((sequence((parserUnreserved))),(sequence((parserPctEncodedUnescaped))),(sequence((parserOtherDelims))),(sequence((parserAny(":")))),(sequence((parserAny("@")))),(sequence((parserAny("/")))),(sequence((parserAny("?")))),(sequence((parserAny("$")))),(sequence((parserAny("'")))),(sequence((parserAny("="))))))(level, input); }
function parserQualifiedcomplextypename(level : number , input: string) { return addName("qualifiedComplexTypeName",sequence((parserNamespace),(parserAny(".")),(parserComplextypename)))(level, input); }
function parserQualifiedentitytypename(level : number , input: string) { return addName("qualifiedEntityTypeName",sequence((parserNamespace),(parserAny(".")),(parserEntitytypename)))(level, input); }
function parserQualifiedenumtypename(level : number , input: string) { return addName("qualifiedEnumTypeName",sequence((parserNamespace),(parserAny(".")),(parserEnumerationtypename)))(level, input); }
function parserQualifiedtypedefinitionname(level : number , input: string) { return addName("qualifiedTypeDefinitionName",sequence((parserNamespace),(parserAny(".")),(parserTypedefinitionname)))(level, input); }
function parserQualifiedtypename(level : number , input: string) { return addName("qualifiedTypeName",choice((sequence((parserSinglequalifiedtypename))),(sequence((parserAny("Collection")),(parserOpen),(parserSinglequalifiedtypename),(parserClose)))))(level, input); }
function parserQuotationMark(level : number , input: string) { return addName("quotation-mark",choice((sequence((parserDquote))),(sequence((parserAny("%22"))))))(level, input); }
function parserRingliteral(level : number , input: string) { return addName("ringLiteral",sequence((parserOpen),(parserPositionliteral),(repetition(0,0,sequence((sequence((parserComma),(parserPositionliteral))),(parserClose))))))(level, input); }
function parserRootexpr(level : number , input: string) { return addName("rootExpr",sequence((parserAny("$root/")),(choice((sequence((parserEntitysetname),(parserKeypredicate))),(sequence((parserSingletonentity))))),(optional(sequence((parserSinglenavigationexpr))))))(level, input); }
function parserRootexprcol(level : number , input: string) { return addName("rootExprCol",sequence((parserBeginArray),(optional(sequence((parserRootexpr),(repetition(0,0,sequence((sequence((parserValueSeparator),(parserRootexpr))))))))),(parserEndArray)))(level, input); }
function parserRoundmethodcallexpr(level : number , input: string) { return addName("roundMethodCallExpr",sequence((parserAny("round")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserSbytevalue(level : number , input: string) { return addName("sbyteValue",sequence((optional(sequence((parserSign)))),(repetition(1,3,sequence((parserDigit))))))(level, input); }
function parserSearch(level : number , input: string) { return addName("search",sequence((choice((sequence((parserAny("$search")))),(sequence((parserAny("search")))))),(parserEq),(parserBws),(parserSearchexpr)))(level, input); }
function parserSearchandexpr(level : number , input: string) { return addName("searchAndExpr",sequence((parserRws),(optional(sequence((parserAny("AND")),(parserRws)))),(parserSearchexpr)))(level, input); }
function parserSearchexpr(level : number , input: string) { return addName("searchExpr",sequence((choice((sequence((parserOpen),(parserBws),(parserSearchexpr),(parserBws),(parserClose))),(sequence((parserSearchterm))))),(optional(choice((sequence((parserSearchorexpr))),(sequence((parserSearchandexpr))))))))(level, input); }
function parserSearchorexpr(level : number , input: string) { return addName("searchOrExpr",sequence((parserRws),(parserAny("OR")),(parserRws),(parserSearchexpr)))(level, input); }
function parserSearchphrase(level : number , input: string) { return addName("searchPhrase",sequence((parserQuotationMark),(repetition(1,0,sequence((parserQcharNoAmpDquote),(parserQuotationMark))))))(level, input); }
function parserSearchterm(level : number , input: string) { return addName("searchTerm",sequence((optional(sequence((parserAny("NOT")),(parserRws)))),(choice((sequence((parserSearchphrase))),(sequence((parserSearchword)))))))(level, input); }
function parserSearchword(level : number , input: string) { return addName("searchWord",sequence((repetition(1,0,sequence((choice((sequence((parserAlpha))),(sequence((parserDigit))),(sequence((parserComma))),(sequence((parserAny(".")))),(sequence((parserPctEncoded))))))))))(level, input); }
function parserSecond(level : number , input: string) { return addName("second",sequence((parserZerotofiftynine)))(level, input); }
function parserSecondmethodcallexpr(level : number , input: string) { return addName("secondMethodCallExpr",sequence((parserAny("second")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserSimplekey(level : number , input: string) { return addName("simpleKey",sequence((parserOpen),(choice((sequence((parserParameteralias))),(sequence((parserKeypropertyvalue))))),(parserClose)))(level, input); }
function parserSingleenumvalue(level : number , input: string) { return addName("singleEnumValue",choice((sequence((parserEnumerationmember))),(sequence((parserEnummembervalue)))))(level, input); }
function parserSinglenavpropinjson(level : number , input: string) { return addName("singleNavPropInJSON",sequence((parserQuotationMark),(parserEntitynavigationproperty),(parserQuotationMark),(parserNameSeparator),(parserRootexpr)))(level, input); }
function parserSinglenavigationexpr(level : number , input: string) { return addName("singleNavigationExpr",sequence((parserAny("/")),(parserMemberexpr)))(level, input); }
function parserSinglequalifiedtypename(level : number , input: string) { return addName("singleQualifiedTypeName",choice((sequence((parserQualifiedentitytypename))),(sequence((parserQualifiedcomplextypename))),(sequence((parserQualifiedtypedefinitionname))),(sequence((parserQualifiedenumtypename))),(sequence((parserPrimitivetypename)))))(level, input); }
function parserSinglevalue(level : number , input: string) { return addName("singleValue",sequence((parserDecimalvalue)))(level, input); }
function parserSingletonentity(level : number , input: string) { return addName("singletonEntity",sequence((parserOdataidentifier)))(level, input); }
function parserSridliteral(level : number , input: string) { return addName("sridLiteral",sequence((parserAny("SRID")),(parserEq),(repetition(1,5,sequence((parserDigit),(parserSemi))))))(level, input); }
function parserStartswithmethodcallexpr(level : number , input: string) { return addName("startsWithMethodCallExpr",sequence((parserAny("startswith")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserStreamproperty(level : number , input: string) { return addName("streamProperty",sequence((parserOdataidentifier)))(level, input); }
function parserString(level : number , input: string) { return addName("string",sequence((parserSquote),(repetition(0,0,sequence((choice((sequence((parserSquoteInString))),(sequence((parserPcharNoSquote))))),(parserSquote))))))(level, input); }
function parserStringinjson(level : number , input: string) { return addName("stringInJSON",sequence((parserQuotationMark),(repetition(0,0,sequence((parserCharinjson),(parserQuotationMark))))))(level, input); }
function parserSubDelims(level : number , input: string) { return addName("sub-delims",choice((sequence((parserAny("$")))),(sequence((parserAny("&")))),(sequence((parserAny("'")))),(sequence((parserAny("=")))),(sequence((parserOtherDelims)))))(level, input); }
function parserSubexpr(level : number , input: string) { return addName("subExpr",sequence((parserRws),(parserAny("sub")),(parserRws),(parserCommonexpr)))(level, input); }
function parserSubstringmethodcallexpr(level : number , input: string) { return addName("substringMethodCallExpr",sequence((parserAny("substring")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserComma),(parserBws),(parserCommonexpr),(parserBws),(optional(sequence((parserComma),(parserBws),(parserCommonexpr),(parserBws)))),(parserClose)))(level, input); }
function parserTermname(level : number , input: string) { return addName("termName",sequence((parserOdataidentifier)))(level, input); }
function parserTimemethodcallexpr(level : number , input: string) { return addName("timeMethodCallExpr",sequence((parserAny("time")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserTimeofdayvalue(level : number , input: string) { return addName("timeOfDayValue",sequence((parserHour),(parserAny(":")),(parserMinute),(optional(sequence((parserAny(":")),(parserSecond),(optional(sequence((parserAny(".")),(parserFractionalseconds)))))))))(level, input); }
function parserTolowermethodcallexpr(level : number , input: string) { return addName("toLowerMethodCallExpr",sequence((parserAny("tolower")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserTouppermethodcallexpr(level : number , input: string) { return addName("toUpperMethodCallExpr",sequence((parserAny("toupper")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserTotaloffsetminutesmethodcallexpr(level : number , input: string) { return addName("totalOffsetMinutesMethodCallExpr",sequence((parserAny("totaloffsetminutes")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserTotalsecondsmethodcallexpr(level : number , input: string) { return addName("totalsecondsMethodCallExpr",sequence((parserAny("totalseconds")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserTrimmethodcallexpr(level : number , input: string) { return addName("trimMethodCallExpr",sequence((parserAny("trim")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserTypedefinitionname(level : number , input: string) { return addName("typeDefinitionName",sequence((parserOdataidentifier)))(level, input); }
function parserUnreserved(level : number , input: string) { return addName("unreserved",choice((sequence((parserAlpha))),(sequence((parserDigit))),(sequence((parserAny("-")))),(sequence((parserAny(".")))),(sequence((parserAny("_")))),(sequence((parserAny("~"))))))(level, input); }
function parserValueSeparator(level : number , input: string) { return addName("value-separator",sequence((parserBws),(parserComma),(parserBws)))(level, input); }
function parserYear(level : number , input: string) { return addName("year",sequence((optional(sequence((parserAny("-"))))),(sequence((parserAny("0")),(repetition(3,3,choice((sequence((parserDigit))),(sequence((parserOnetonine),(repetition(3,0,sequence((parserDigit)))))))))))))(level, input); }
function parserYearmethodcallexpr(level : number , input: string) { return addName("yearMethodCallExpr",sequence((parserAny("year")),(parserOpen),(parserBws),(parserCommonexpr),(parserBws),(parserClose)))(level, input); }
function parserZerotofiftynine(level : number , input: string) { return addName("zeroToFiftyNine",sequence((choice((sequence((parserAny("0")))),(sequence((parserAny("1")))),(sequence((parserAny("2")))),(sequence((parserAny("3")))),(sequence((parserAny("4")))),(sequence((parserAny("5")))))),(parserDigit)))(level, input); }
