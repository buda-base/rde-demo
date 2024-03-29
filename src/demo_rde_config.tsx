import React, { useState, useEffect } from "react"
import {
  NodeShape,
  generateSubnodes,
  RDEConfig,
  LocalEntityInfo,
  fetchTtl,
  IFetchState,
  RDFResource,
  Subject,
  EntityGraph,
  ExtRDFResourceWithLabel,
  Entity,
  BUDAResourceSelector,
  ValueByLangToStrPrefLang,
  atoms,
  ns,
  rdf
} from "rdf-document-editor"
//} from "../index" 

import { useRecoilState } from "recoil"

import { customAlphabet } from "nanoid"
import edtf, { parse } from "edtf" // see https://github.com/inukshuk/edtf.js/issues/36#issuecomment-1073778277

import i18n from "i18next"
import { debug as debugFactory } from "debug"

const debug = debugFactory("rde:entity:container:demo")

const langs = [
  {
    value: "en",
  },
  {
    value: "fr",
    keyboard: ["à", "ç", "é", "è", "ê", "î", "ô", "ù", "û"],
  },
]

const generateConnectedID = async (old_resource: RDFResource, old_shape: NodeShape, type: RDFResource) => {
  // just for the demo:
  return Promise.resolve(rdf.sym(old_resource.uri + "_CONNECTED"))
}

const demoShape = rdf.sym("http://purl.bdrc.io/ontology/shapes/core/PersonShape")

const BDR_uri = "http://purl.bdrc.io/resource/"

const prefixMap = new ns.PrefixMap({
  rdfs: ns.RDFS_uri,
  rdf: ns.RDF_uri,
  skos: ns.SKOS_uri,
  bdr: BDR_uri,
  bdo: "http://purl.bdrc.io/ontology/core/",
  adm: "http://purl.bdrc.io/ontology/admin/",
  bda: "http://purl.bdrc.io/admindata/",
  bds: "http://purl.bdrc.io/ontology/shapes/core/",
  bdsa: "http://purl.bdrc.io/ontology/shapes/adm/",
})

const getShapesDocument = async (entity: rdf.NamedNode) => {
  // we always load the example shape in the demo
  const loadRes = fetchTtl("/examples/PersonUIShapes.ttl")
  const { store, etag } = await loadRes
  const shape = new NodeShape(demoShape, new EntityGraph(store, demoShape.uri, prefixMap))
  return Promise.resolve(shape)
}

const getDocumentGraph = async (entity: rdf.NamedNode) => {
  if (entity?.value == "http://purl.bdrc.io/resource/P1583") {
    const loadRes = fetchTtl("/examples/P1583.ttl")
    const { store, etag } = await loadRes
    return Promise.resolve({store, etag})
  }
  return Promise.resolve({ store:new rdf.Store(), etag: "" })
}

const getConnexGraph = async (entity: rdf.NamedNode) => {
  if (entity?.value == "http://purl.bdrc.io/resource/P1583") {
    const loadRes = fetchTtl("/examples/P1583-connexGraph.ttl")
    const { store, etag } = await loadRes
    return Promise.resolve(store)
  }
  return Promise.resolve(new rdf.Store())
}

const getDocument = async (entity: rdf.NamedNode) => {
  const {store: documentGraph, etag } = await getDocumentGraph(entity)
  const connexGraph: rdf.Store = await getConnexGraph(entity)
  const res = new Subject(entity, new EntityGraph(documentGraph, entity.uri, prefixMap, connexGraph))
  debug("res:", res, etag)
  return Promise.resolve({ subject: res, etag })
}

const nanoidCustom = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8) // eslint-disable-line no-magic-numbers

const generateNode = async () => {
  return Promise.resolve(rdf.sym(BDR_uri + "P0DEMO" + nanoidCustom()))
}

let timeout: string | number | NodeJS.Timeout | null | undefined = null

export function EntityCreator(shapeNode: rdf.NamedNode, entityNode: rdf.NamedNode | null, unmounting = { val: false }) {
  const [entityLoadingState, setEntityLoadingState] = useState<IFetchState>({ status: "idle", error: undefined })
  const [entity, setEntity] = useState<Subject | null>(null)
  const [shape, setShape] = useState<NodeShape | null>(null)
  const [entities, setEntities] = useRecoilState<atoms.Entity[]>(atoms.entitiesAtom)
  const [tab, setTab] = useRecoilState(atoms.uiTabState)

  useEffect(() => {
    return () => {
      if(timeout) { 
        clearTimeout(timeout)
        timeout = null
      }
      unmounting.val = true
    }
  }, [])

  const reset = () => {
    setEntity(null)
    setShape(null)
    setEntityLoadingState({ status: "idle", error: undefined })
  }

  useEffect(() => {
    async function createResource(shapeNode: rdf.NamedNode, entityNode: rdf.NamedNode | null) {

      if (!unmounting.val) setEntityLoadingState({ status: "fetching shape", error: undefined })
      const loadShape = getShapesDocument(shapeNode)

      let shape: NodeShape
      try {
        shape = await loadShape
        if (!unmounting.val) setShape(shape)
      } catch (e) {
        if (!unmounting.val) setEntityLoadingState({ status: "error", error: "error fetching shape" })
        return
      }
      if (!unmounting.val) setEntityLoadingState({ status: "creating", error: undefined })
      if (!entityNode) entityNode = await generateNode()
      const graph = new EntityGraph(rdf.graph(), entityNode.uri, prefixMap)
      const newSubject = new Subject(entityNode, graph)
      const newEntity: atoms.Entity = {
        subjectQname: newSubject.qname,
        state: atoms.EditedEntityState.NeedsSaving,
        shapeQname: shape.qname,
        subject: newSubject,
        subjectLabelState: newSubject.getAtomForProperty(ns.prefLabel.uri),
        etag: null,
        loadedUnsavedFromLocalStorage: false
      }
      if (!unmounting.val) {
        const newEntities = [newEntity, ...entities]
        setEntities(newEntities)
      }
      if (!unmounting.val) setEntity(newSubject)
      if (!unmounting.val) setEntityLoadingState({ status: "created", error: undefined })

      // save to localStorage
      setUserLocalEntity(newSubject.qname, shape.qname, "", false, null, true)

      if (!unmounting.val && tab !== 0) setTab(0)
      if (!unmounting.val) setEntity(newSubject)
      if (!unmounting.val) setEntityLoadingState({ status: "created", error: undefined })      

      timeout = null
    }
    if(!timeout) timeout = setTimeout(() => createResource(shapeNode, entityNode), 150)
  }, [shapeNode, entityNode])

  return { entityLoadingState, entity, reset }
}

export const iconFromEntity = (entity: Entity | null): string => {
  return ""
}

export const getUserMenuState = async (): Promise<Record<string, Entity>> => {
  const datastr = localStorage.getItem("rde_menu_state")
  return datastr ? await JSON.parse(datastr) : {}
}

export const setUserMenuState = async (
  subjectQname: string,
  shapeQname: string | null,
  labels: string | undefined,
  del: boolean,
  etag: string | null
): Promise<void> => {
  const datastr = localStorage.getItem("rde_menu_state")
  const data = datastr ? await JSON.parse(datastr) : {}
  if (!del) data[subjectQname] = { shapeQname, labels, etag }
  else if (data[subjectQname]) delete data[subjectQname]
  const dataNewStr = JSON.stringify(data)
  localStorage.setItem("rde_menu_state", dataNewStr)
}

export const getUserLocalEntities = async (): Promise<Record<string, LocalEntityInfo>> => {
  const datastr = localStorage.getItem("rde_entities")
  return datastr ? await JSON.parse(datastr) : {}
}

export const setUserLocalEntity = async (
  subjectQname: string,
  shapeQname: string | null,
  ttl: string | undefined,
  del: boolean,
  etag: string | null,
  needsSaving: boolean
): Promise<void> => {
  const datastr = localStorage.getItem("rde_entities")
  const data = datastr ? await JSON.parse(datastr) : {}
  if (!del) data[subjectQname] = { shapeQname, ttl, etag, needsSaving }
  else if (data[subjectQname]) delete data[subjectQname]
  const dataNewStr = JSON.stringify(data)
  localStorage.setItem("rde_entities", dataNewStr)
}

const personShapeRef = new ExtRDFResourceWithLabel(demoShape.uri, { en: "Person" }, undefined, undefined, prefixMap)

const possibleShapeRefs = [personShapeRef]

const possibleShapeRefsForEntity = (entity: rdf.NamedNode) => {
  return possibleShapeRefs
}

const EDTF_DT_uri = "http://id.loc.gov/datatypes/edtf/EDTF"
const EDTF_DT = rdf.sym("http://id.loc.gov/datatypes/edtf/EDTF")

export const humanizeEDTF = (obj: Record<string, any>, str = "", locale = "en-US", dbg = false): string => {
  if (!obj) return ""

  const conc = (values: Array<any>, separator?: string) => {
    separator = separator ? " " + separator + " " : ""
    return values.reduce((acc: string, v, i, array) => {
      if (i > 0) acc += i < array.length - 1 ? ", " : separator
      acc += humanizeEDTF(v, "", locale)
      return acc
    }, "")
  }

  // just output EDTF object
  if (dbg) return JSON.stringify(obj, null, 3) // eslint-disable-line no-magic-numbers

  if (obj.type === "Set") return conc(obj.values, "or")
  else if (obj.type === "List") return conc(obj.values, "and")
  else if (obj.type === "Interval" && !obj.values[0]) return "not after " + conc([obj.values[1]])
  else if (obj.type === "Interval" && !obj.values[1]) return "not before " + conc([obj.values[0]])
  else if (obj.type === "Interval") return "between " + conc(obj.values, "and")
  else if (obj.approximate) {
    if (obj.type === "Century") return "circa " + (Number(obj.values[0]) + 1) + "th c."
    return "circa " + humanizeEDTF({ ...obj, approximate: false }, str, locale, dbg)
  } else if (obj.uncertain) {
    if (obj.type === "Century") return Number(obj.values[0]) + 1 + "th c. ?"
    return humanizeEDTF({ ...obj, uncertain: false }, str, locale, dbg) + "?"
  } else if (obj.unspecified === 12) return obj.values[0] / 100 + 1 + "th c." // eslint-disable-line no-magic-numbers
  else if (obj.type === "Century") return Number(obj.values[0]) + 1 + "th c."
  else if (obj.unspecified === 8) return obj.values[0] + "s" // eslint-disable-line no-magic-numbers
  else if (obj.type === "Decade") return obj.values[0] + "0s"
  else if (!obj.unspecified && obj.values.length === 1) return obj.values[0]
  else if (!obj.unspecified && obj.values.length === 3) {
    // eslint-disable-line no-magic-numbers
    try {
      const event = new Date(Date.UTC(obj.values[0], obj.values[1], obj.values[2], 0, 0, 0)) // eslint-disable-line no-magic-numbers
      const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "numeric", day: "numeric" }
      const val = event.toLocaleDateString(locale, options)
      return val
    } catch (e) {
      debug("locale error:", e, str, obj)
    }
    return str
  } else {
    return str
  }
}

const locales: Record<string, string> = { en: "en-US", "zh-hans": "zh-Hans-CN", bo: "bo-CN" }

const previewLiteral = (lit: rdf.Literal, uiLang: string) => {
  if (lit.datatype.value == EDTF_DT.value) {
    try {
      const obj = parse(lit.value)
      const edtfObj = edtf(lit.value)
      const edtfMin = edtf(edtfObj.min)?.values[0]
      const edtfMax = edtf(edtfObj.max)?.values[0]
      if (edtfMin <= -4000 || edtfMax >= 2100) 
        throw Error(i18n.t("error.year", { min: -4000, max: 2100 }) as string) // eslint-disable-line no-magic-numbers
      return { value: humanizeEDTF(obj, lit.value, uiLang), error: null }
    } catch (e: any) {
      return {
        value: null,
        error: (
          <>
            This field must be in EDTF format, see&nbsp;
            <a href="https://www.loc.gov/standards/datetime/" rel="noopener noreferrer" target="_blank">
              https://www.loc.gov/standards/datetime/
            </a>
            .
            {!["No possible parsing", "Syntax error"].some((err) => e.message?.includes(err)) && (
              <>
                <br />[{e.message}]
              </>
            )}
          </>
        ),
      }
    }
  }
  return { value: null, error: null }
}

const putDocument = async (entity: rdf.NamedNode, document: rdf.Store) => {
  return ""
}

export const demoConfig: RDEConfig = {
  generateSubnodes: generateSubnodes,
  valueByLangToStrPrefLang: ValueByLangToStrPrefLang,
  possibleLiteralLangs: langs,
  labelProperties: ns.defaultLabelProperties,
  descriptionProperties: ns.defaultDescriptionProperties,
  prefixMap: prefixMap,
  getConnexGraph: getConnexGraph,
  generateConnectedID: generateConnectedID,
  getShapesDocument: getShapesDocument,
  getDocument: getDocument,
  entityCreator: EntityCreator,
  iconFromEntity: iconFromEntity,
  getUserMenuState: getUserMenuState,
  setUserMenuState: setUserMenuState,
  getUserLocalEntities: getUserLocalEntities,
  setUserLocalEntity: setUserLocalEntity,
  possibleShapeRefs: possibleShapeRefs,
  possibleShapeRefsForEntity: possibleShapeRefsForEntity,
  possibleShapeRefsForType: possibleShapeRefsForEntity,
  libraryUrl: "https://library.bdrc.io",
  resourceSelector: BUDAResourceSelector,
  previewLiteral: previewLiteral,
  putDocument: putDocument,
  getPreviewLink: (entity: rdf.NamedNode) => {
    return ""
  },
}
