<?php

namespace Espo\Core\Controllers;

use \Espo\Core\Exceptions\Error;
use \Espo\Core\Exceptions\Forbidden;
use \Espo\Core\Exceptions\NotFound;
use \Espo\Core\Exceptions\BadRequest;
use \Espo\Core\Utils\Util;

class Record extends Base
{
    const MAX_SIZE_LIMIT = 200;

    public static $defaultAction = 'list';

    protected $defaultRecordServiceName = 'Record';

    protected function getEntityManager()
    {
        return $this->getContainer()->get('entityManager');
    }

    protected function getRecordService($name = null)
    {
        if (empty($name)) {
            $name = $this->name;
        }

        if ($this->getServiceFactory()->checkExists($name)) {
            $service = $this->getServiceFactory()->create($name);
        } else {
            $service = $this->getServiceFactory()->create($this->defaultRecordServiceName);
            $service->setEntityType($name);
        }

        return $service;
    }

    public function actionRead($params, $data, $request)
    {
        $id = $params['id'];
        $entity = $this->getRecordService()->readEntity($id);

        if (empty($entity)) {
            throw new NotFound();
        }

        return $entity->getValueMap();
    }

    public function actionPatch($params, $data, $request)
    {
        return $this->actionUpdate($params, $data, $request);
    }

    public function actionCreate($params, $data, $request)
    {
        if (!$request->isPost()) {
            throw new BadRequest();
        }

        if (!$this->getAcl()->check($this->name, 'create')) {
            throw new Forbidden();
        }

        $service = $this->getRecordService();

        if ($entity = $service->createEntity($data)) {
            return $entity->getValueMap();
        }

        throw new Error();
    }

    public function actionUpdate($params, $data, $request)
    {
        if (!$request->isPut() && !$request->isPatch()) {
            throw new BadRequest();
        }

        if (!$this->getAcl()->check($this->name, 'edit')) {
            throw new Forbidden();
        }

        $id = $params['id'];

        if ($entity = $this->getRecordService()->updateEntity($id, $data)) {
            return $entity->getValueMap();
        }

        throw new Error();
    }

    public function actionList($params, $data, $request)
    {
        if (!$this->getAcl()->check($this->name, 'read')) {
            throw new Forbidden();
        }

        $where = $request->get('where');
        $offset = $request->get('offset');
        $maxSize = $request->get('maxSize');
        $asc = $request->get('asc', 'true') === 'true';
        $sortBy = $request->get('sortBy');
        $q = $request->get('q');
        $textFilter = $request->get('textFilter');

        $maxSizeLimit = $this->getConfig()->get('recordListMaxSizeLimit', self::MAX_SIZE_LIMIT);
        if (empty($maxSize)) {
            $maxSize = $maxSizeLimit;
        }
        if (!empty($maxSize) && $maxSize > $maxSizeLimit) {
            throw new Forbidden("Max should should not exceed " . $maxSizeLimit . ". Use offset and limit.");
        }

        $params = array(
            'where' => $where,
            'offset' => $offset,
            'maxSize' => $maxSize,
            'asc' => $asc,
            'sortBy' => $sortBy,
            'q' => $q,
            'textFilter' => $textFilter
        );

        $this->fetchListParamsFromRequest($params, $request, $data);

        if (isset($params['select']) && !empty($params['select'])) {
            $params['skipCurrencyConvertedParams'] = true;
        }

        $result = $this->getRecordService()->findEntities($params);

        return array(
            'total' => $result['total'],
            'list' => isset($result['collection']) ? $result['collection']->getValueMapList() : $result['list']
        );
    }

    public function getActionListKanban($params, $data, $request)
    {
        if (!$this->getAcl()->check($this->name, 'read')) {
            throw new Forbidden();
        }

        $where = $request->get('where');
        $offset = $request->get('offset');
        $maxSize = $request->get('maxSize');
        $asc = $request->get('asc', 'true') === 'true';
        $sortBy = $request->get('sortBy');
        $q = $request->get('q');
        $textFilter = $request->get('textFilter');

        $maxSizeLimit = $this->getConfig()->get('recordListMaxSizeLimit', self::MAX_SIZE_LIMIT);
        if (empty($maxSize)) {
            $maxSize = $maxSizeLimit;
        }
        if (!empty($maxSize) && $maxSize > $maxSizeLimit) {
            throw new Forbidden("Max should should not exceed " . $maxSizeLimit . ". Use offset and limit.");
        }

        $params = array(
            'where' => $where,
            'offset' => $offset,
            'maxSize' => $maxSize,
            'asc' => $asc,
            'sortBy' => $sortBy,
            'q' => $q,
            'textFilter' => $textFilter
        );

        $this->fetchListParamsFromRequest($params, $request, $data);

        $result = $this->getRecordService()->getListKanban($params);

        return (object) [
            'total' => $result->total,
            'list' => $result->collection->getValueMapList(),
            'additionalData' => $result->additionalData
        ];
    }

    protected function fetchListParamsFromRequest(&$params, $request, $data)
    {
        if ($request->get('primaryFilter')) {
            $params['primaryFilter'] = $request->get('primaryFilter');
        }
        if ($request->get('boolFilterList')) {
            $params['boolFilterList'] = $request->get('boolFilterList');
        }
        if ($request->get('filterList')) {
            $params['filterList'] = $request->get('filterList');
        }

        if ($request->get('select')) {
            $params['select'] = explode(',', $request->get('select'));
        }
    }

    public function actionListLinked($params, $data, $request)
    {
        $id = $params['id'];
        $link = $params['link'];

        $where = $request->get('where');
        $offset = $request->get('offset');
        $maxSize = $request->get('maxSize');
        $asc = $request->get('asc', 'true') === 'true';
        $sortBy = $request->get('sortBy');
        $q = $request->get('q');
        $textFilter = $request->get('textFilter');

        $maxSizeLimit = $this->getConfig()->get('recordListMaxSizeLimit', self::MAX_SIZE_LIMIT);
        if (empty($maxSize)) {
            $maxSize = $maxSizeLimit;
        }
        if (!empty($maxSize) && $maxSize > $maxSizeLimit) {
            throw new Forbidden("Max should should not exceed " . $maxSizeLimit . ". Use offset and limit.");
        }

        $params = array(
            'where' => $where,
            'offset' => $offset,
            'maxSize' => $maxSize,
            'asc' => $asc,
            'sortBy' => $sortBy,
            'q' => $q,
            'textFilter' => $textFilter
        );

        $this->fetchListParamsFromRequest($params, $request, $data);

        $result = $this->getRecordService()->findLinkedEntities($id, $link, $params);

        return array(
            'total' => $result['total'],
            'list' => isset($result['collection']) ? $result['collection']->getValueMapList() : $result['list']
        );
    }

    public function actionDelete($params, $data, $request)
    {
        if (!$request->isDelete()) {
            throw new BadRequest();
        }

        $id = $params['id'];

        if ($this->getRecordService()->deleteEntity($id)) {
            return true;
        }
        throw new Error();
    }

    public function actionExport($params, $data, $request)
    {
        if (!$request->isPost()) {
            throw new BadRequest();
        }

        if ($this->getConfig()->get('exportDisabled') && !$this->getUser()->isAdmin()) {
            throw new Forbidden();
        }

        if ($this->getAcl()->get('exportPermission') !== 'yes' && !$this->getUser()->isAdmin()) {
            throw new Forbidden();
        }

        if (!$this->getAcl()->check($this->name, 'read')) {
            throw new Forbidden();
        }

        $ids = isset($data->ids) ? $data->ids : null;
        $where = isset($data->where) ? json_decode(json_encode($data->where), true) : null;
        $byWhere = isset($data->byWhere) ? $data->byWhere : false;
        $selectData = isset($data->selectData) ? json_decode(json_encode($data->selectData), true) : null;

        $params = array();
        if ($byWhere) {
            $params['selectData'] = $selectData;
            $params['where'] = $where;
        } else {
            $params['ids'] = $ids;
        }

        if (isset($data->attributeList)) {
            $params['attributeList'] = $data->attributeList;
        }

        if (isset($data->fieldList)) {
            $params['fieldList'] = $data->fieldList;
        }

        if (isset($data->format)) {
            $params['format'] = $data->format;
        }

        return array(
            'id' => $this->getRecordService()->export($params)
        );
    }

    public function actionMassUpdate($params, $data, $request)
    {
        if (!$request->isPut()) {
            throw new BadRequest();
        }

        if (!$this->getAcl()->check($this->name, 'edit')) {
            throw new Forbidden();
        }
        if (empty($data->attributes)) {
            throw new BadRequest();
        }

        $params = array();
        if (property_exists($data, 'where') && !empty($data->byWhere)) {
            $params['where'] = json_decode(json_encode($data->where), true);
            if (property_exists($data, 'selectData')) {
                $params['selectData'] = json_decode(json_encode($data->selectData), true);
            }
        } else if (property_exists($data, 'ids')) {
            $params['ids'] = $data->ids;
        }

        $attributes = $data->attributes;

        $idsUpdated = $this->getRecordService()->massUpdate($attributes, $params);

        return $idsUpdated;
    }

    public function actionMassDelete($params, $data, $request)
    {
        if (!$request->isPost()) {
            throw new BadRequest();
        }
        if (!$this->getAcl()->check($this->name, 'delete')) {
            throw new Forbidden();
        }

        $params = array();
        if (property_exists($data, 'where') && !empty($data->byWhere)) {
            $where = json_decode(json_encode($data->where), true);
            $params['where'] = $where;
            if (property_exists($data, 'selectData')) {
                $params['selectData'] = json_decode(json_encode($data->selectData), true);
            }
        }
        if (property_exists($data, 'ids')) {
            $params['ids'] = $data->ids;
        }

        return $this->getRecordService()->massRemove($params);
    }

    public function actionCreateLink($params, $data, $request)
    {
        if (!$request->isPost()) {
            throw new BadRequest();
        }

        if (empty($params['id']) || empty($params['link'])) {
            throw new BadRequest();
        }

        $id = $params['id'];
        $link = $params['link'];

        if (!empty($data->massRelate)) {
            if (!is_array($data->where)) {
                throw new BadRequest();
            }
            $where = json_decode(json_encode($data->where), true);

            $selectData = null;
            if (isset($data->selectData) && is_array($data->selectData)) {
                $selectData = json_decode(json_encode($data->selectData), true);
            }

            return $this->getRecordService()->linkEntityMass($id, $link, $where, $selectData);
        } else {
            $foreignIdList = array();
            if (isset($data->id)) {
                $foreignIdList[] = $data->id;
            }
            if (isset($data->ids) && is_array($data->ids)) {
                foreach ($data->ids as $foreignId) {
                    $foreignIdList[] = $foreignId;
                }
            }

            $result = false;
            foreach ($foreignIdList as $foreignId) {
                if ($this->getRecordService()->linkEntity($id, $link, $foreignId)) {
                    $result = true;
                }
            }
            if ($result) {
                return true;
            }
        }

        throw new Error();
    }

    public function actionRemoveLink($params, $data, $request)
    {
        if (!$request->isDelete()) {
            throw new BadRequest();
        }

        $id = $params['id'];
        $link = $params['link'];

        if (empty($params['id']) || empty($params['link'])) {
            throw new BadRequest();
        }

        $foreignIdList = [];
        if (isset($data->id)) {
            $foreignIdList[] = $data->id;
        }
        if (isset($data->ids) && is_array($data->ids)) {
            foreach ($data->ids as $foreignId) {
                $foreignIdList[] = $foreignId;
            }
        }

        $result = false;
        foreach ($foreignIdList as $foreignId) {
            if ($this->getRecordService()->unlinkEntity($id, $link, $foreignId)) {
                $result = $result || true;
            }
        }
        if ($result) {
            return true;
        }

        throw new Error();
    }

    public function actionFollow($params, $data, $request)
    {
        if (!$request->isPut()) {
            throw new BadRequest();
        }
        if (!$this->getAcl()->check($this->name, 'stream')) {
            throw new Forbidden();
        }
        $id = $params['id'];
        return $this->getRecordService()->follow($id);
    }

    public function actionUnfollow($params, $data, $request)
    {
        if (!$request->isDelete()) {
            throw new BadRequest();
        }
        if (!$this->getAcl()->check($this->name, 'read')) {
            throw new Forbidden();
        }
        $id = $params['id'];
        return $this->getRecordService()->unfollow($id);
    }

    public function actionMerge($params, $data, $request)
    {
        if (!$request->isPost()) {
            throw new BadRequest();
        }

        if (empty($data->targetId) || empty($data->sourceIds) || !is_array($data->sourceIds) || !($data->attributes instanceof \StdClass)) {
            throw new BadRequest();
        }
        $targetId = $data->targetId;
        $sourceIds = $data->sourceIds;
        $attributes = $data->attributes;

        if (!$this->getAcl()->check($this->name, 'edit')) {
            throw new Forbidden();
        }

        return $this->getRecordService()->merge($targetId, $sourceIds, $attributes);
    }

    public function postActionGetDuplicateAttributes($params, $data, $request)
    {
        if (empty($data->id)) {
            throw new BadRequest();
        }

        if (!$this->getAcl()->check($this->name, 'create')) {
            throw new Forbidden();
        }
        if (!$this->getAcl()->check($this->name, 'read')) {
            throw new Forbidden();
        }

        return $this->getRecordService()->getDuplicateAttributes($data->id);
    }

    public function postActionMassFollow($params, $data, $request)
    {
        if (!$this->getAcl()->check($this->name, 'stream')) {
            throw new Forbidden();
        }

        if (property_exists($data, 'ids')) {
            $params['ids'] = $data->ids;
        }

        return $this->getRecordService()->massFollow($params);
    }

    public function postActionMassUnfollow($params, $data, $request)
    {
        if (!$this->getAcl()->check($this->name, 'stream')) {
            throw new Forbidden();
        }

        if (property_exists($data, 'ids')) {
            $params['ids'] = $data->ids;
        }

        return $this->getRecordService()->massUnfollow($params);
    }
}