import React from 'react';
import {debounce} from 'lodash';
import {requestCatalog} from '../utils/TotaraLoadCatalog';
import {requestCalendar} from '../utils/TotaraLoadCalendar'
import DataTable from '../rh-components/rh-DataTable';
import {getCurrentRoute, setRoute} from '../utils/HashRouter';

class CourseCatalog extends React.Component {

  constructor() {
    super();

    this.state = {
      catalogData           : null,
      selectedCategory      : '',
      selectedModeOfDelivery: '',
      searchText            : '',
      showFilters           : true
    };

    // Limit calls for performance
    this.onSearchTextChange = debounce(this.onSearchTextChange, 200);
    this.rawCatalogData = null;
    this.rawCalendarData = null;
  }

  componentDidMount() {
    this.setSearchParams();
    this.loadCalendar();
  }

  // The calendar also loads the catalog so we don't need to do that too
  // loadCatalog() {
  //   requestCatalog(this.props.config.webservice).then((data) => {
  //     console.log('SUCCESS');
  //     // this.setCatalogData(data);
  //     this.rawCatalogData = data;
  //     this.loadCalendar();
  //   }).catch((err) => {
  //     console.log('ERROR!', err);
  //   });
  // }

  loadCalendar() {
    requestCalendar(this.props.config.webservice).then((data) => {
      console.log('SUCCESS', data);
      // this.setCalendarData(data);
      this.rawCalendarData = data;
      this.setCatalogData(data.catalog);
    }).catch((err) => {
      console.log('ERROR!', err);
    });
  }

  setSearchParams() {
    let currentHash = getCurrentRoute().data,
        searchCat   = currentHash.c || '',
        searchMod   = currentHash.m || '',
        searchText  = currentHash.s || '',
        showFilters = parseInt(currentHash.f) === 1 ? true : false;

    console.log('Passed search params: ', searchCat, searchMod, searchText);
    this.setState({
      selectedCategory      : searchCat,
      selectedModeOfDelivery: searchMod,
      searchText            : searchText,
      showFilters           : showFilters
    });
  }

  setCatalogData(data) {
    this.setState({catalogData: data});
  }

  onCategoryChange(e) {
    this.setState({selectedCategory: this.refs.categorySelect.value});
  }

  onModeOfDeliveryChange(e) {
    this.setState({selectedModeOfDelivery: this.refs.deliverySelect.value});
  }

  // Debounced in constructor to help performance
  onSearchTextChange(e) {
    this.setState({searchText: this.refs.searchField.value.toLowerCase()});
  }

  componentWillUpdate(nextProps, nextState) {
    setRoute('/', {
      c: nextState.selectedCategory,
      m: nextState.selectedModeOfDelivery,
      s: nextState.searchText,
      f: nextState.showFilters ? '1' : '0'
    })
  }

  getFilteredCatalog() {
    let catalog        = this.state.catalogData.catalog,
        filterCategory = this.state.selectedCategory,
        filterDelivery = this.state.selectedModeOfDelivery,
        filterText     = this.state.searchText;

    return catalog.filter((row) => {
      let name          = row.fullname.toLowerCase(),
          courseCode    = row.shortname.toLowerCase(),
          summary       = row.summary.toLowerCase(),
          matchFilter   = name.indexOf(filterText) >= 0 || courseCode.indexOf(filterText) >= 0 || summary.indexOf(filterText) >= 0,
          matchCategory = filterCategory.length ? row.category === filterCategory : true,
          matchDelivery = filterDelivery.length ? row.deliverymode === filterDelivery : true;

      return matchFilter && matchCategory && matchDelivery;
    });
  }

  courseDataToTableRow(data) {
    let linkStem = 'https://learning.redhat.com/course/view.php?id=';
    return data.reduce((p, c) => {
      p.push([
        {content: c.fullname, link: c.deeplink, newWindow: true},
        {content: c.deeplink},
        {content: c.shortname},
        {content: this.getDuration(c.fullname)},
        {content: c.summary},
        {content: c.category},
        {content: c.deliverymode}
        // {content: c.datecreated}
      ]);
      return p;
    }, [])
  }

  getDuration(coursename) {
    let matchingcourse = this.rawCalendarData.classes.filter((course) => course.fullname === coursename)[0];
    if(matchingcourse) {
      return matchingcourse.duration;
    }
    return '';
  }

  render() {
    let filters,
        content = <p>Please wait, loading the catalog ...</p>;

    if (this.state.catalogData) {
      let tableData = {
        headers: [
          {content: 'Name', sorted: 1, className: ''},
          {content: 'Deep link', sorted: 1, className: ''},
          {content: 'Course code', sorted: 0, className: ''},
          {content: 'Duration', sorted: 0, className: ''},
          {content: 'Summary', sorted: 0, className: ''},
          {content: 'Category', sorted: 0, className: ''},
          {content: 'Mode of delivery', sorted: 0, className: ''}
          // {content: 'Created on', sorted: 0, className: ''}
        ],
        data   : this.courseDataToTableRow(this.getFilteredCatalog())
      };


      filters = this.state.showFilters ? this.renderFilterForm() : <div/>;

      content = (<div>
        {filters}
        <DataTable data={tableData}/></div>);
    }

    return (<div>
      {content}
    </div>);
  }

  renderFilterForm() {
    return (
      <div className="rh-form-inline">
        <div className="rh-form-group text-center">
          <label htmlFor="category">Category</label>
          <select name="category" ref="categorySelect" className="width-50pct"
                  onChange={this.onCategoryChange.bind(this)}>
            <option value="" selected></option>
            {this.state.catalogData.courseCategoryList.map((c) => {
              let option = <option value={c}>{c}</option>;
              if (c === this.state.selectedCategory) {
                option = <option value={c} selected>{c}</option>;
              }
              return option;
            })}
          </select>
        </div>
        <div className="rh-form-group text-center">
          <label htmlFor="mode">Mode of delivery</label>
          <select name="delivery" ref="deliverySelect" className="width-50pct"
                  onChange={this.onModeOfDeliveryChange.bind(this)}>
            <option value="" selected></option>
            {this.state.catalogData.courseMODList.map((c) => {
              let option = <option value={c}>{c}</option>;
              if (c === this.state.selectedModeOfDelivery) {
                option = <option value={c} selected>{c}</option>;
              }
              return option;
            })}
          </select>
        </div>
        <div className="rh-form-group text-center">
          <label htmlFor="search">Search</label>
          <input id="search" ref="searchField" className="width-50pct"
                 type="text" defaultValue={this.state.searchText}
                 onChange={this.onSearchTextChange.bind(this)}/>
          <p className="small">Names, summaries and course codes.</p>
        </div>
      </div>
    );
  }

}

CourseCatalog.propTypes = {
  config: React.PropTypes.object
};

export default CourseCatalog;